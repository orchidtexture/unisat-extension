import BigNumber from 'bignumber.js';
import { useEffect, useMemo, useState } from 'react';

import wallet from '@/background/controller/wallet';
import { COIN_DUST } from '@/shared/constant';
import { RawTxInfo } from '@/shared/types';
import { Button, Column, Content, Input, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { FeeRateBar } from '@/ui/components/FeeRateBar';
import { useAccountBalance, useCurrentAccount } from '@/ui/state/accounts/hooks';
import {
  useBitcoinTx,
  useFetchUtxosCallback,
  usePrepareSendBTCCallback,
  usePushBitcoinTxCallback,
  useSafeBalance
} from '@/ui/state/transactions/hooks';
import { colors } from '@/ui/theme/colors';
import { amountToSatoshis, isValidAddress, satoshisToAmount } from '@/ui/utils';
import { signMessageOfBIP322Simple } from '@unisat/wallet-sdk/lib/message';

import { useNavigate } from '../MainRoute';

export default function BridgeBTCToBisonScreen() {
  const bisonBTCVaultAddress = 'tb1p9fnmrzh5kyxxfxy7gsw08c43846vd44v4mghhlkjj0se38emywgq5myfqv'; // TODO: handle better (not hardcoded)
  const networkType = wallet.getNetworkType();
  const accountBalance = useAccountBalance();
  const safeBalance = useSafeBalance();
  const navigate = useNavigate();
  const bitcoinTx = useBitcoinTx();
  const currentAccount = useCurrentAccount();
  const [inputAmount, setInputAmount] = useState(
    bitcoinTx.toSatoshis > 0 ? satoshisToAmount(bitcoinTx.toSatoshis) : ''
  );
  const pushBitcoinTx = usePushBitcoinTxCallback();
  const [disabled, setDisabled] = useState(true);
  const toInfo = {
    address: bisonBTCVaultAddress,
    domain: bitcoinTx.toDomain,
    inscription: undefined
  };

  const [error, setError] = useState('');

  const [autoAdjust, setAutoAdjust] = useState(false);
  const fetchUtxos = useFetchUtxosCallback();

  const tools = useTools();
  useEffect(() => {
    tools.showLoading(true);
    fetchUtxos().finally(() => {
      tools.showLoading(false);
    });
  }, []);

  const prepareSendBTC = usePrepareSendBTCCallback();

  const safeSatoshis = useMemo(() => {
    return amountToSatoshis(safeBalance);
  }, [safeBalance]);

  const toSatoshis = useMemo(() => {
    if (!inputAmount) return 0;
    return amountToSatoshis(inputAmount);
  }, [inputAmount]);

  const dustAmount = useMemo(() => satoshisToAmount(COIN_DUST), [COIN_DUST]);

  const [feeRate, setFeeRate] = useState(5);

  const [rawTxInfo, setRawTxInfo] = useState<RawTxInfo>();

  const enableRBF = false;

  useEffect(() => {
    setError('');
    setDisabled(true);

    if (!isValidAddress(toInfo.address)) {
      return;
    }
    if (!toSatoshis) {
      return;
    }
    if (toSatoshis < COIN_DUST) {
      setError(`Amount must be at least ${dustAmount} BTC`);
      return;
    }

    if (toSatoshis > safeSatoshis) {
      setError('Amount exceeds your available balance');
      return;
    }

    if (feeRate <= 0) {
      return;
    }

    if (toSatoshis == bitcoinTx.toSatoshis && feeRate == bitcoinTx.feeRate) {
      //Prevent repeated triggering caused by setAmount
      setDisabled(false);
      return;
    }

    prepareSendBTC({ toAddressInfo: toInfo, toAmount: toSatoshis, feeRate, enableRBF })
      .then((data) => {
        // if (data.fee < data.estimateFee) {
        //   setError(`Network fee must be at leat ${data.estimateFee}`);
        //   return;
        // }
        setRawTxInfo(data);
        console.log(data);
        setDisabled(false);
      })
      .catch((e) => {
        console.log(e);
        setError(e.message);
      });
  }, [inputAmount, feeRate, enableRBF]);

  const showSafeBalance = useMemo(
    () => !new BigNumber(accountBalance.amount).eq(new BigNumber(safeBalance)),
    [accountBalance.amount, safeBalance]
  );

  const getBisonNonce = async (address) => {
    try {
      const nonceResponce = await fetch(`https://testnet.bisonlabs.io/sequencer_endpoint/nonce/${address}`);
      const nonceData = await nonceResponce.json();
      const nonce = nonceData.nonce + 1;
      return nonce;
    } catch (e) {
      tools.toastError((e as Error).message);
    }
  };

  const handleDeposit = async (address) => {
    // const { success, txid, error } = await pushBitcoinTx(rawTxInfo?.rawtx as string);
    const success = true;
    if (success) {
      // push pegin msg to bison sequencer
      try {
        const nonce = await getBisonNonce(address);
        const data = {
          method: 'peg_in',
          token: 'btc',
          // L1txid: txid,
          L1txid: '739b1b5d0557db85fd5668b2310aa8834bebdf6366e22b5a2c95b9424a8685ac',
          sAddr: address,
          rAddr: address,
          nonce: nonce,
          sig: ''
        };
        const dataString = JSON.stringify(data);
        const sig = await signMessageOfBIP322Simple({
          message: dataString,
          address: address,
          networkType,
          wallet: wallet as any
        });
        console.log('after nonce');
        data.sig = sig;
        setTimeout(async () => {
          try {
            await fetch('https://testnet.bisonlabs.io/sequencer_endpoint/enqueue_transaction', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(data)
            });
            navigate('TxSuccessScreen', { txId: '739b1b5d0557db85fd5668b2310aa8834bebdf6366e22b5a2c95b9424a8685ac' });
          } catch (e) {
            console.log('error on peg in');
            tools.toastError((e as Error).message);
          }
        }, 100);
      } catch (e) {
        console.log('error on nonce');
        tools.toastError((e as Error).message);
      }
    } else {
      navigate('TxFailScreen', { error });
    }
  };

  return (
    <Content style={{ padding: '0px 16px 24px' }}>
      <Column mt="lg">
        <Row justifyBetween>
          <Text text="Balance" color="textDim" />
          {showSafeBalance ? (
            <Text text={`${accountBalance.amount} BTC`} preset="bold" size="sm" />
          ) : (
            <Row
              onClick={() => {
                setAutoAdjust(true);
                setInputAmount(accountBalance.amount);
              }}>
              <Text text="MAX" preset="sub" style={{ color: autoAdjust ? colors.yellow_light : colors.white_muted }} />
              <Text text={`${accountBalance.amount} BTC`} preset="bold" size="sm" />
            </Row>
          )}
        </Row>
        <Row justifyBetween>
          <Text text="Unconfirmed BTC" color="textDim" />
          <Text text={`${accountBalance.pending_btc_amount} BTC`} size="sm" preset="bold" color="textDim" />
        </Row>
        {showSafeBalance && (
          <Row justifyBetween>
            <Text text="Available (safe to send)" color="textDim" />

            <Row
              onClick={() => {
                setAutoAdjust(true);
                setInputAmount(safeBalance.toString());
              }}>
              <Text text={'MAX'} color={autoAdjust ? 'yellow' : 'textDim'} size="sm" />
              <Text text={`${safeBalance} BTC`} preset="bold" size="sm" />
            </Row>
          </Row>
        )}
        <Input
          preset="amount"
          placeholder={'Amount'}
          defaultValue={inputAmount}
          value={inputAmount}
          onAmountInputChange={(amount) => {
            if (autoAdjust == true) {
              setAutoAdjust(false);
            }
            setInputAmount(amount);
          }}
        />
      </Column>

      <Column mt="lg">
        <Text text="Fee" color="textDim" />

        <FeeRateBar
          onChange={(val) => {
            setFeeRate(val);
          }}
        />
      </Column>

      {error && <Text text={error} color="error" />}

      <Button
        disabled={disabled}
        preset="primary"
        text="Deposit"
        onClick={() =>
          navigate('BridgeToBisonCofirmScreen', {
            txId: '739b1b5d0557db85fd5668b2310aa8834bebdf6366e22b5a2c95b9424a8685ac'
          })
        }></Button>
    </Content>
  );
}
