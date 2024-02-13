import { Column, Content, Footer, Header, Layout, Text } from '@/ui/components';
import { NavTabBar } from '@/ui/components/NavTabBar';

export default function FaqTabScreen() {
  return (
    <Layout>
      <Header />
      <Content>
        <Column mt='md'>
          <Text text="Help Us Perfect ZKy Wallet!" preset="regular-bold" />
          <Text color="textDim" text="Facing a technical issue? Reach out to us on X @bitcoinZKy.
          Your reports are essential for enhancing our platform for the crypto community." />
        </Column>
        <Column mt='md' style={{display: 'inline-block'}}>
          <Text text="Do you need tesnet balance?" preset="regular-bold" style={{display: 'block'}}/>
          <Text color="textDim" text="Use the" style={{display: 'inline-block', marginRight: '6px'}}/>
          <Text 
            style={{display: 'inline-block'}}
            onClick={() => {
              window.open(`https://coinfaucet.eu/en/btc-testnet/`);
            }}
            text={'Bitcoin Testnet Faucet'} />
          <Text 
            style={{display: 'inline-block'}}
            color="textDim" text="to obtain Bitcoin on testnet. Use the bridge functionality to have balance on the Bison testnet network."/>
        </Column>
      </Content>
      <Footer px="zero" py="zero">
        <NavTabBar tab="faq" />
      </Footer>
    </Layout>
  );
}
