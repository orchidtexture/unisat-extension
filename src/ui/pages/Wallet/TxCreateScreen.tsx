import { Tabs } from 'antd';
import { useEffect } from 'react';

import { Content, Header, Layout } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { useAppDispatch } from '@/ui/state/hooks';
import { useFetchUtxosCallback } from '@/ui/state/transactions/hooks';
import { useAssetTabKey } from '@/ui/state/ui/hooks';
import { AssetTabKey, uiActions } from '@/ui/state/ui/reducer';
import TxBisonCreateScreen from './TxBisonCreateScreen';
import TxBitcoinCreateScreen from './TxBitcoinCreateScreen';

export default function TxCreateScreen() {
  const dispatch = useAppDispatch();
  const assetTabKey = useAssetTabKey();

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
