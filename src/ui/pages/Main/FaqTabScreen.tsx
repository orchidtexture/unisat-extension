import { useState } from 'react';

import { Button, Column, Content, Footer, Header, Input, Layout, Text } from '@/ui/components';
import { NavTabBar } from '@/ui/components/NavTabBar';

export default function FaqTabScreen() {
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const scriptUrl =
    'https://script.google.com/a/macros/kondor.finance/s/AKfycbwmDk3to09ucq4HPK_3PVQ_9dVujoPzfsEEP0lwU1xG5Ge6lPc7QJ4ICcksROUm3Jtm/exec';
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);

    const formData = new FormData();
    console.log(email, message);
    formData.append('email', email);
    formData.append('message', message);
    for (const pair of formData.entries()) {
      console.log(`${pair[0]}: ${pair[1]}`);
    }
    fetch(scriptUrl, {
      method: 'POST',
      body: formData
    })
      .then(() => {
        setLoading(false);
      })
      .catch((err) => console.log(err));
  };

  return (
    <Layout>
      <Header />
      <Content>
        <Column mt="md">
          <Text text="Help us improve Zky Wallet!" preset="regular-bold" />
          <Text
            color="textDim"
            text="Feature requests or technical issues? please fill this form or reach out to us on X @zkywallet.
          Lets make Zky experience awesome for the Bitcoin community."
          />
          <div>
            <form method="post" name="google-sheet">
              <Input
                name="email"
                containerStyle={{ marginTop: 8 }}
                preset="text"
                placeholder={'Email (optional)'}
                value={email}
                onChange={(i) => {
                  setEmail(i.target.value);
                }}
              />
              <Input
                containerStyle={{ marginTop: 8 }}
                name="message"
                preset="text"
                placeholder={'Request/Issue'}
                value={message}
                onChange={(i) => {
                  setMessage(i.target.value);
                }}
              />
            </form>
            <Button
              style={{ marginTop: 8 }}
              disabled={message.length === 0}
              preset="primary"
              text={loading ? 'Loading...' : 'Send'}
              onClick={handleSubmit}
            />
          </div>
        </Column>
        <Column mt="md" style={{ display: 'inline-block' }}>
          <Text text="Do you need tesnet balance?" preset="regular-bold" style={{ display: 'block' }} />
          <Text color="textDim" text="Use the" style={{ display: 'inline-block', marginRight: '6px' }} />
          <Text
            style={{ display: 'inline-block' }}
            onClick={() => {
              window.open('https://coinfaucet.eu/en/btc-testnet/');
            }}
            text={'Bitcoin Testnet Faucet'}
          />
          <Text
            style={{ display: 'inline-block' }}
            color="textDim"
            text="to obtain Bitcoin on testnet. Use the bridge functionality to have balance on the Bison testnet network."
          />
        </Column>
      </Content>
      <Footer px="zero" py="zero">
        <NavTabBar tab="faq" />
      </Footer>
    </Layout>
  );
}
