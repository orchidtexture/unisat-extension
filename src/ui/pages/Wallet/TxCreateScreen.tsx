import { Tabs } from 'antd';
import axios from 'axios';
import React, { useEffect, useState } from 'react';

import { BISONAPI_URL_TESTNET } from '@/shared/constant';
import { BisonBalance, ContractBison, ContractsBisonResponse, Inscription } from '@/shared/types';
import { Content, Header, Layout } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useNavigate } from '@/ui/pages/MainRoute';
import { useAppDispatch } from '@/ui/state/hooks';
import { useBitcoinTx, useFetchUtxosCallback } from '@/ui/state/transactions/hooks';
import { useAssetTabKey } from '@/ui/state/ui/hooks';
import { AssetTabKey, uiActions } from '@/ui/state/ui/reducer';
import { satoshisToAmount } from '@/ui/utils';
import TxBisonCreateScreen from './TxBisonCreateScreen';
import TxBitcoinCreateScreen from './TxBitcoinCreateScreen';

const getBisonContracts = async (): Promise<ContractsBisonResponse> => {
  const res = await axios.get(`${BISONAPI_URL_TESTNET}/sequencer_endpoint/contracts_list`);
  const contracts: ContractBison[] = res.data?.contracts;
  return { contracts };
};

export default function TxCreateScreen() {
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

  const tabItems = [
    {
      key: AssetTabKey.BISON,
      label: 'Bison asset',
      children: <TxBisonCreateScreen />
    },
    {
      key: AssetTabKey.BITCOIN,
      label: 'Bitcoin L1',
      children: <TxBitcoinCreateScreen />
    }
  ];

  return (
    <Layout>
      <Header
        onBack={() => {
          window.history.go(-1);
        }}
        title="Send"
      />
      <Content style={{ padding: '0px 16px 24px' }}>
        <Tabs
          size={'small'}
          defaultActiveKey={assetTabKey as unknown as string}
          activeKey={assetTabKey as unknown as string}
          items={tabItems as unknown as any[]}
          onTabClick={(key) => {
            dispatch(uiActions.updateAssetTabScreen({ assetTabKey: key as unknown as AssetTabKey }));
          }}
        />
      </Content>
    </Layout>
  );
}
