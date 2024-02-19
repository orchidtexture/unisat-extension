import { Tabs } from 'antd';

import { Column, Content, Footer, Header, Icon, Layout, Text } from '@/ui/components';
import { NavTabBar } from '@/ui/components/NavTabBar';
import { useAppDispatch } from '@/ui/state/hooks';
import { useAssetTabKey } from '@/ui/state/ui/hooks';
import { AssetTabKey, uiActions } from '@/ui/state/ui/reducer';
import { fontSizes } from '@/ui/theme/font';

import BisonPegInScreen from '../Wallet/BisonPegInScreen';

export default function BridgeTabScreen() {
  const assetTabKey = useAssetTabKey();
  const dispatch = useAppDispatch();

  const BTCPegOut = () => {
    return (
      <Column mt="md" style={{ display: 'inline-block' }}>
        <Text text="Coming Soon!" preset="regular-bold" style={{ display: 'block' }} />
        <Text
          color="textDim"
          text="In the meantime you can withdraw your BTC at Bison Labs."
          style={{ display: 'inline-block', marginRight: '6px', marginTop: 6 }}
        />
        <div style={{ display: 'inline-flex', marginTop: 6 }}>
          <Text
            style={{ display: 'inline-block' }}
            onClick={() => {
              window.open('https://testnet.bisonlabs.io/bridge');
            }}
            text={'Go To Bridge'}
          />
          <Icon icon="link" size={fontSizes.xs} style={{ marginLeft: 3 }} />
        </div>
      </Column>
    );
  };

  const tabItems = [
    {
      key: AssetTabKey.BISON,
      label: 'To Bison',
      children: <BisonPegInScreen />
    },
    {
      key: AssetTabKey.BITCOIN,
      label: 'To Bitcoin L1',
      children: <BTCPegOut />
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
