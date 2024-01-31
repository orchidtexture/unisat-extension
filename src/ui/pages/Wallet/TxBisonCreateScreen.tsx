import { BISONAPI_URL_TESTNET, COIN_DUST } from '@/shared/constant';
import { BalanceBisonResponse, BisonBalance, ContractBison, ContractsBisonResponse, Inscription, RawTxInfo } from '@/shared/types';
import { Button, Column, Content, Header, Input, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useNavigate } from '@/ui/pages/MainRoute';
import { useAccountBalance } from '@/ui/state/accounts/hooks';
import {
  useBitcoinTx,
  useFetchUtxosCallback,
  usePrepareSendBTCCallback,
  useSafeBalance
} from '@/ui/state/transactions/hooks';
import { colors } from '@/ui/theme/colors';
import { amountToSatoshis, isValidAddress, satoshisToAmount } from '@/ui/utils';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import React, { useEffect, useMemo, useState } from 'react';
import './Styles.css';

const getBisonContracts = async (): Promise<ContractsBisonResponse> => {
  const res = await axios.get(`${BISONAPI_URL_TESTNET}/sequencer_endpoint/contracts_list`)
  const contracts: ContractBison[] = res.data?.contracts
  return {contracts};
};

export default function TxCreateScreen() {
  const [contracts, setContracts] = useState<ContractBison[]>([]);
  const [selectedContract, setSelectedContract] = useState<string>('');

  useEffect(() => {
    getBisonContracts().then(response => {
      setContracts(response.contracts);
    });
  }, []);

  const handleContractChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedContract(e.target.value);
  };

  const fetchBalance = async () => {
    try {
      const contract = contracts.find(c => c.contractAddr === selectedContract);
      if (!contract) return;

      const balanceEndpoint = `${contract.contractEndpoint}/balance`;
      const balanceResponse = await axios.post<BalanceBisonResponse>(balanceEndpoint, {
        address: contract.contractAddr
      });

      const result: BisonBalance = {
        ticker: contract.tick,
        balance: balanceResponse.data.balance
      };

      console.log('Balance:', result);
    } catch (error) {
      console.error('Error:', error);
    }
  };



  const accountBalance = useAccountBalance();
  const safeBalance = useSafeBalance();
  const navigate = useNavigate();
  const bitcoinTx = useBitcoinTx();
  const [inputAmount, setInputAmount] = useState(
    bitcoinTx.toSatoshis > 0 ? satoshisToAmount(bitcoinTx.toSatoshis) : ''
  );
  const [disabled, setDisabled] = useState(true);
  const [toInfo, setToInfo] = useState<{
    address: string;
    domain: string;
    inscription?: Inscription;
  }>({
    address: bitcoinTx.toAddress,
    domain: bitcoinTx.toDomain,
    inscription: undefined
  });

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

  const [enableRBF, setEnableRBF] = useState(false);
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

    if (toInfo.address == bitcoinTx.toAddress && toSatoshis == bitcoinTx.toSatoshis && feeRate == bitcoinTx.feeRate) {
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
        setDisabled(false);
      })
      .catch((e) => {
        console.log(e);
        setError(e.message);
      });
  }, [toInfo, inputAmount, feeRate, enableRBF]);

  const showSafeBalance = useMemo(
    () => !new BigNumber(accountBalance.amount).eq(new BigNumber(safeBalance)),
    [accountBalance.amount, safeBalance]
  );

  return (
    <Layout>
      <Header
        onBack={() => {
          window.history.go(-1);
        }}
        title="Send Bison token"
      />
      <Content style={{ padding: '0px 16px 24px' }}>
        <Row justifyCenter>
          <Text text="Select token" preset="regular" color="textDim" />
          <select
            id="contract-select"
            className="select"
            value={selectedContract}
            onChange={handleContractChange}
          >
            <option value="">Select a contract...</option>
            {contracts.map(contract => (
              <option key={contract.contractAddr} value={contract.contractAddr}>
                {contract.contractName}
              </option>
            ))}
          </select>
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
            {showSafeBalance ? (
              <Text text={`${accountBalance.amount} BTC`} preset="bold" size="sm" />
            ) : (
              <Row
                onClick={() => {
                  setAutoAdjust(true);
                  setInputAmount(accountBalance.amount);
                }}>
                <Text
                  text="MAX"
                  preset="sub"
                  style={{ color: autoAdjust ? colors.yellow_light : colors.white_muted }}
                />
                <Text text={`${accountBalance.amount} BTC`} preset="bold" size="sm" />
              </Row>
            )}
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

        {error && <Text text={error} color="error" />}

        <Button
          disabled={disabled}
          preset="primary"
          text="Next"
          onClick={(e) => {
            navigate('TxConfirmScreen', { rawTxInfo });
          }}></Button>
      </Content>
    </Layout>
  );
}
