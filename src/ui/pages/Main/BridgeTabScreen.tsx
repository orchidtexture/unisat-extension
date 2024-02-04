import { Tabs } from 'antd';

import { Column, Content, Footer, Header, Layout, Text } from '@/ui/components';
import { NavTabBar } from '@/ui/components/NavTabBar';
import { useAppDispatch } from '@/ui/state/hooks';
import { useAssetTabKey } from '@/ui/state/ui/hooks';
import { AssetTabKey, uiActions } from '@/ui/state/ui/reducer';

import BridgeBTCToBisonScreen from '../Wallet/BridgeBTCToBisonScreen';

export default function BridgeTabScreen() {
  const assetTabKey = useAssetTabKey();
  const dispatch = useAppDispatch();

  const tabItems = [
    {
      key: AssetTabKey.BISON,
      label: 'To Bison',
      children: <BridgeBTCToBisonScreen />
    },
    {
      key: AssetTabKey.BITCOIN,
      label: 'To Bitcoin L1',
      children: <span />
    }
  ];

  return (
    <Layout>
      <Header />
      <Content>
        <Column gap="xl">
          <Text text="Bison BTC Bridge" size="xl" textCenter />

          {/* <div>
            <BisonBitcoinBalance />
          </div> */}

          <Tabs
            size={'small'}
            defaultActiveKey={assetTabKey as unknown as string}
            activeKey={assetTabKey as unknown as string}
            items={tabItems as unknown as any[]}
            onTabClick={(key) => {
              dispatch(uiActions.updateAssetTabScreen({ assetTabKey: key as unknown as AssetTabKey }));
            }}
          />
        </Column>
      </Content>
      <Footer px="zero" py="zero">
        <NavTabBar tab="bridge" />
      </Footer>
    </Layout>
  );
}
