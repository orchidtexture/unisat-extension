import wallet from '@/background/controller/wallet';
import { COIN_DUST } from '@/shared/constant';
import { BisonBalance, Inscription } from '@/shared/types';
import { Button, Column, Content, Input, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useNavigate } from '@/ui/pages/MainRoute';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useBitcoinTx, useFetchUtxosCallback } from '@/ui/state/transactions/hooks';
import { colors } from '@/ui/theme/colors';
import { amountToSatoshis, isValidAddress, satoshisToAmount } from '@/ui/utils';
import { Select } from 'antd';
import { useEffect, useMemo, useState } from 'react';


export default function TxBisonCreateScreen() {
  const [balances, setBalances] = useState<BisonBalance[]>([]);
  const [selectedBalance, setSelectedBalance] = useState<BisonBalance | null>(null);
  const currentAccount = useCurrentAccount();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [autoAdjust, setAutoAdjust] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const bitcoinTx = useBitcoinTx();

  const [inputAmount, setInputAmount] = useState(
    bitcoinTx.toSatoshis > 0 ? satoshisToAmount(bitcoinTx.toSatoshis) : ''
  );
  const [toInfo, setToInfo] = useState<{
      address: string;
      domain: string;
      inscription?: Inscription;
    }>({
      address: bitcoinTx.toAddress,
      domain: bitcoinTx.toDomain,
      inscription: undefined
    });

  const fetchUtxos = useFetchUtxosCallback();
  const tools = useTools();
  const dustAmount = useMemo(() => satoshisToAmount(COIN_DUST), [COIN_DUST]);

  useEffect(() => {
    wallet.getBisonContractBalances(currentAccount.address)
      .then(setBalances);
  }, [currentAccount]);


  useEffect(() => {
    tools.showLoading(true);
    fetchUtxos().finally(() => {
      tools.showLoading(false);
    });
  }, []);

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

    if (toSatoshis > (selectedBalance?.balance || 0)) {
      setError('Amount exceeds your available balance');
      return;
    }

    // if (feeRate <= 0) {
    //   return;
    // }

    // delete when above if lines are fixed
    setDisabled(false)
    return;
    // if (toInfo.address == bitcoinTx.toAddress && toSatoshis == bitcoinTx.toSatoshis && feeRate == bitcoinTx.feeRate) {
    //   //Prevent repeated triggering caused by setAmount
    //   setDisabled(false);
    //   return;
    // }

    // prepareSendBTC({ toAddressInfo: toInfo, toAmount: toSatoshis, feeRate, enableRBF })
    //   .then((data) => {
    //   // if (data.fee < data.estimateFee) {
    //     //   setError(`Network fee must be at leat ${data.estimateFee}`);
    //     //   return;
    //     // }
    //     setRawTxInfo(data);
    //     setDisabled(false);
    //   })
    //   .catch((e) => {
    //     console.log(e);
    //     setError(e.message);
    //   });
  }, [toInfo, inputAmount]);


  const handleContractChange = (ticker: string) => {
    const b = balances.find(b => b.ticker === ticker)
    setSelectedBalance(b || null)
  };

  const toSatoshis = useMemo(() => {
    if (!inputAmount) return 0;
    return amountToSatoshis(inputAmount);
  }, [inputAmount]);

  return (
    <Content style={{ padding: '0px 16px 24px' }}>
      <Row>
        <Text text="Bison contract" preset="regular" color="textDim" />
        <Select
          style={{
            width: 200,
            border: '2px solid #142918',
            borderRadius: '5%'}}
          placeholder='Select a contract'
          onChange={handleContractChange}
          options={balances.map((balance, index) => ({
            key: balance.ticker + index,
            value: balance.ticker,
            label: balance.ticker
          }))}
        />
      </Row>

      <Column mt="lg">
        <Text text="Recipient" preset="regular" color="textDim" />
        <Input
          preset="address"
          addressInputData={toInfo}
          onAddressInputChange={(val) => {
            setToInfo(val);
          }}
          autoFocus={true}
        />
      </Column>

      <Column mt="lg">
        <Row justifyBetween>
          <Text text="Balance" color="textDim" />
          <Row
            onClick={() => {
              setAutoAdjust(true);
            }}>
            <Text text="MAX" preset="sub" style={{ color: autoAdjust ? colors.yellow_light : colors.white_muted }} />
            <Text text={`${satoshisToAmount(selectedBalance?.balance || 0)} ${selectedBalance?.ticker || ''}`} preset="bold" size="sm" />
          </Row>
        </Row>
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

      {error && <Text text={error} color="error" />}

      <Button
        disabled={disabled}
        preset="primary"
        text="Next"
        onClick={() => {
          navigate('TxBisonConfirmScreen', {});
        }}></Button>
    </Content>
  );
}
