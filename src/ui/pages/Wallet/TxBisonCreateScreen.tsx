import axios from 'axios';
import React, { useEffect, useState } from 'react';

import { BISONAPI_URL_TESTNET } from '@/shared/constant';
import { BisonBalance, ContractBison, ContractsBisonResponse, Inscription } from '@/shared/types';
import { Button, Column, Content, Input, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useNavigate } from '@/ui/pages/MainRoute';
import { useAppDispatch } from '@/ui/state/hooks';
import { useBitcoinTx, useFetchUtxosCallback } from '@/ui/state/transactions/hooks';
import { useAssetTabKey } from '@/ui/state/ui/hooks';
import { colors } from '@/ui/theme/colors';
import { satoshisToAmount } from '@/ui/utils';

import './Styles.css';

const getBisonContracts = async (): Promise<ContractsBisonResponse> => {
  const res = await axios.get(`${BISONAPI_URL_TESTNET}/sequencer_endpoint/contracts_list`);
  const contracts: ContractBison[] = res.data?.contracts;
  return { contracts };
};

export default function TxBisonCreateScreen() {
  const [contracts, setContracts] = useState<ContractBison[]>([]);
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [balance, setBalance] = useState<BisonBalance | null>(null);
  const dispatch = useAppDispatch();
  const assetTabKey = useAssetTabKey();

  useEffect(() => {
    getBisonContracts().then((response) => {
      setContracts(response.contracts);
    });
  }, []);

  useEffect(() => {
    if (selectedContract) {
      fetchBalance();
    } else {
      setBalance(null);
    }
  }, [selectedContract]);

  const handleContractChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedContract(e.target.value);
  };

  const fetchBalance = async () => {
    try {
      // const currentAccount = useCurrentAccount();

      // const contract = contracts.find(c => c.contractAddr === selectedContract);
      // if (!contract) return;

      // const balanceEndpoint = `${contract.contractEndpoint}/balance`;
      // const balanceResponse = await axios.post<BalanceBisonResponse>(balanceEndpoint, {
      //   address: currentAccount.address
      // });

      // const result: BisonBalance = {
      //   ticker: contract.tick,
      //   balance: balanceResponse.data.balance
      // };

      setBalance({
        ticker: 'bBTC',
        balance: 0.002
      });
    } catch (error) {
      console.error('Error:', error);
      setBalance(null);
    }
  };

  const navigate = useNavigate();
  const bitcoinTx = useBitcoinTx();
  const [inputAmount, setInputAmount] = useState(
    bitcoinTx.toSatoshis > 0 ? satoshisToAmount(bitcoinTx.toSatoshis) : ''
  );
  const [disabled, setDisabled] = useState(false);
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

  return (
    <Content style={{ padding: '0px 16px 24px' }}>
      <Row justifyCenter>
        <Text text="Select token" preset="regular" color="textDim" />
        <select id="contract-select" className="select" value={selectedContract} onChange={handleContractChange}>
          <option value="">Select a contract...</option>
          {contracts.map((contract) => (
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
          <Row
            onClick={() => {
              setAutoAdjust(true);
            }}>
            <Text text="MAX" preset="sub" style={{ color: autoAdjust ? colors.yellow_light : colors.white_muted }} />
            <Text text={`${balance?.balance || 0} ${balance?.ticker || ''}`} preset="bold" size="sm" />
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
        onClick={(e) => {
          console.log('next button');
          navigate('TxBisonConfirmScreen', {});
        }}></Button>
    </Content>
  );
}
