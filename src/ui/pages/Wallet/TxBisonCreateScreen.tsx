import wallet from '@/background/controller/wallet';
import { BISONAPI_URL_TESTNET } from '@/shared/constant';
import { BisonBalance, ContractBison, ContractsBisonResponse, Inscription } from '@/shared/types';
import { Button, Column, Content, Input, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useNavigate } from '@/ui/pages/MainRoute';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useBitcoinTx, useFetchUtxosCallback } from '@/ui/state/transactions/hooks';
import { colors } from '@/ui/theme/colors';
import { satoshisToAmount } from '@/ui/utils';
import { Select } from 'antd';
import axios from 'axios';
import { useEffect, useState } from 'react';

const getBisonContracts = async (): Promise<ContractsBisonResponse> => {
  const res = await axios.get(`${BISONAPI_URL_TESTNET}/sequencer_endpoint/contracts_list`);
  const contracts: ContractBison[] = res.data?.contracts;
  return { contracts };
};

export default function TxBisonCreateScreen() {
  const [contracts, setContracts] = useState<ContractBison[]>([]);
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [balance, setBalance] = useState<BisonBalance | null>(null);
  const currentAccount = useCurrentAccount();

  useEffect(() => {
    getBisonContracts().then((response) => {
      setContracts(response.contracts);
    });
  }, []);

  useEffect(() => {
    if (selectedContract) {
      const contract = contracts.find(c => c.contractName === selectedContract);
      if (!contract) return;
      wallet.getBisonContractBalance(currentAccount.address, contract)
        .then(setBalance)
        .catch(error => {
          console.error('Error:', error);
          setBalance(null);
        })
    } else {
      setBalance(null);
    }
  }, [selectedContract]);

  const handleContractChange = (contractAddress: string) => {
    setSelectedContract(contractAddress);
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
      <Row>
        <Text text="Bison contract" preset="regular" color="textDim" />
        <Select
          style={{
            width: 200,
            border: '2px solid #142918',
            borderRadius: '5%'}}
          placeholder='Select a contract'
          onChange={handleContractChange}
          options={contracts.map((contract, index) => ({
            key: contract.contractName + index,
            value: contract.contractName,
            label: contract.contractName
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
