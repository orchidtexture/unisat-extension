import wallet from '@/background/controller/wallet';
import { BisonGetFeeResponse } from '@/shared/types';
import { Button, Card, Column, Content, Footer, Header, Layout, Row, Text } from '@/ui/components';
import { CopyableAddress } from '@/ui/components/CopyableAddress';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { satoshisToAmount } from '@/ui/utils';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from '../MainRoute';

export interface ToSignInput {
  index: number;
  publicKey: string;
  sighashTypes?: number[];
}

export interface DecodedPsbt {
  inputInfos: {
    txid: string;
    vout: number;
    address: string;
    value: number;
    sighashType: number;
  }[];
  outputInfos: {
    address: string;
    value: number;
  }[];
  feeRate: number;
  fee: number;
  features: {
    rbf: boolean;
  };
  risks: { level: 'high' | 'low'; desc: string }[];
}

interface TxInfo {
  changedBalance: number;
  rawtx: string;
  psbtHex: string;
  toSignInputs: ToSignInput[];
  txError: string;
  decodedPsbt: DecodedPsbt;
  isScammer: boolean;
}

const initTxInfo: BisonGetFeeResponse = {
  sAddr: '',
  rAddr: '',
  amt: 0,
  tick: '',
  nonce: 0,
  tokenContractAddress: '',
  sig: '',
  gas_estimated: 0,
  gas_estimated_hash: '',
};


function Section({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Column>
      <Text text={title} preset="bold" />
      <Card>
        <Row full justifyBetween itemsCenter>
          {children}
        </Row>
      </Card>
    </Column>
  );
}

export default function TxBisonConfirmScreen() {
  const navigate = useNavigate()
  const currentAccount = useCurrentAccount();
  const { state } = useLocation();
  const { rawTx } = state as {
    rawTx: BisonGetFeeResponse;
  };

  const handleSign = () => {
    console.log('handleSign')
    wallet.enqueueTx(rawTx)
      .then((r) => {
        console.log(r);
        navigate('TxBisonSuccessScreen')
      })
  }

  return (
    <Layout>
      <Header>
          Confirm transaction
      </Header>

      <Content>
        <Column gap="xl">
          <Card style={{ backgroundColor: '#272626', maxWidth: 320, width: 320 }}>
            <Column gap="lg" justifyCenter>
              <Row itemsCenter>
                <Text
                  text={satoshisToAmount(rawTx?.amt)}
                  color={'white'}
                  preset="bold"
                  textCenter
                  size="xxl"
                />
                <Text text="bBTC" color="textDim" />
              </Row>
              <Text text={`fee ${satoshisToAmount(rawTx?.gas_estimated)}`} color="textDim" />
            </Column>
          </Card>

          <Section title="From:">
            <CopyableAddress address={rawTx.sAddr} />
          </Section>
          <Section title="To:">
            <CopyableAddress address={rawTx.rAddr} />
          </Section>
        </Column>
      </Content>

      <Footer>
        <Row full>
          <Button preset="default" text="Reject" onClick={() => {console.log('')} } full />
          <Button
            preset="primary"
            text={'Sign'}
            onClick={handleSign}
            disabled={false}
            full
          />
        </Row>
      </Footer>
    </Layout>
  )}