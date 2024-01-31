import { RawTxInfo } from '@/shared/types';
import { Button, Card, Column, Content, Footer, Header, Layout, Row, Text } from '@/ui/components';
import React from 'react';
import { useNavigate } from '../MainRoute';


interface LocationState {
  rawTxInfo: RawTxInfo;
}

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

const initTxInfo: TxInfo = {
  changedBalance: 0,
  rawtx: '',
  psbtHex: '',
  toSignInputs: [],
  txError: '',
  isScammer: false,
  decodedPsbt: {
    inputInfos: [],
    outputInfos: [],
    fee: 0,
    feeRate: 0,
    risks: [],
    features: {
      rbf: false
    },
  }
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


function SignTxDetails({ txInfo,}: { txInfo: TxInfo }) {
  const address = '1234565';
  return (
    <Column gap="lg">
      <Text text="Sign Transaction" preset="title-bold" textCenter mt="lg" />
      <Row justifyCenter>
        <Card style={{ backgroundColor: '#272626', maxWidth: 320, width: 320 }}>
          <Column gap="lg">
            <Column>
              <Column>
                <Column justifyCenter>
                  <Row itemsCenter>
                    <Text
                      text={0.001}
                      color={'white'}
                      preset="bold"
                      textCenter
                      size="xxl"
                    />
                    <Text text="bBTC" color="textDim" />
                  </Row>
                </Column>
                <Text text="fee 0.00005980" color="textDim" />
              </Column>
            </Column>
          </Column>
        </Card>
      </Row>
    </Column>
  );
}

const detailsComponent = <SignTxDetails txInfo={initTxInfo} />;


export default function TxBisonConfirmScreen() {
  const navigate = useNavigate()
  console.log('txBisonConfirmScreen')
  return (
    <Layout>
      <Header>
          Confirm transaction
      </Header>
      <Content>
        <Column gap="xl">
          {detailsComponent}
        </Column>
      </Content>

      <Footer>
        <Row full>
          <Button preset="default" text="Reject" onClick={() => {console.log('')} } full />
          <Button
            preset="primary"
            text={'Sign'}
            onClick={() => {
              navigate('TxBisonSuccessScreen')
            }}
            disabled={false}
            full
          />
        </Row>
      </Footer>
    </Layout>
  )}