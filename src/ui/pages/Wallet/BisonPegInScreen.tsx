import BigNumber from 'bignumber.js';
import { useEffect, useMemo, useState } from 'react';

import { COIN_DUST } from '@/shared/constant';
import { RawTxInfo } from '@/shared/types';
import { Button, Column, Content, Input, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { FeeRateBar } from '@/ui/components/FeeRateBar';
import { useAccountBalance } from '@/ui/state/accounts/hooks';
import {
  useBitcoinTx,
  useFetchUtxosCallback,
  usePrepareSendBTCCallback,
  useSafeBalance
} from '@/ui/state/transactions/hooks';
import { colors } from '@/ui/theme/colors';
import { amountToSatoshis, isValidAddress, satoshisToAmount } from '@/ui/utils';

import { useNavigate } from '../MainRoute';

export default function BisonPegInScreen() {
  const bisonBTCVaultAddress = 'tb1p9fnmrzh5kyxxfxy7gsw08c43846vd44v4mghhlkjj0se38emywgq5myfqv'; // TODO: handle better (not hardcoded)
  // const networkType = wallet.getNetworkType();
  const accountBalance = useAccountBalance();
  const safeBalance = useSafeBalance();
  const navigate = useNavigate();
  const bitcoinTx = useBitcoinTx();
  // const currentAccount = useCurrentAccount();
  const [inputAmount, setInputAmount] = useState(
    bitcoinTx.toSatoshis > 0 ? satoshisToAmount(bitcoinTx.toSatoshis) : ''
  );
  // const pushBitcoinTx = usePushBitcoinTxCallback();
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
  const [fee, setFee] = useState<number | undefined>(0);

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
        setFee(data.fee);
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

  const handleDeposit = async () => {
    const success = true;
    if (success) {
      navigate('BisonPegInConfirmScreen', {
        rawtx: rawTxInfo?.rawtx as string,
        inputAmount: amountToSatoshis(inputAmount),
        toAddress: toInfo.address,
        tick: 'btc',
        fee: fee
      });
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

      <Button disabled={disabled} preset="primary" text="Deposit" onClick={() => handleDeposit()}></Button>
    </Content>
  );
}
