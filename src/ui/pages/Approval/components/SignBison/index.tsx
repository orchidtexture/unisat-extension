import React, { useEffect, useMemo, useState } from 'react';

import { BisonTxType, DecodedPsbt, ToSignInput } from '@/shared/types';
import { Button, Card, Column, Content, Footer, Header, Icon, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { WarningPopover } from '@/ui/components/WarningPopover';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { useAccountAddress, useCurrentAccount } from '@/ui/state/accounts/hooks';
import { usePrepareSendBTCCallback, usePrepareSendOrdinalsInscriptionsCallback } from '@/ui/state/transactions/hooks';
import { fontSizes } from '@/ui/theme/font';
import { copyToClipboard, shortAddress, useApproval, useWallet } from '@/ui/utils';
import { LoadingOutlined } from '@ant-design/icons';

interface Props {
  header?: React.ReactNode;
  txId: string;
  type: BisonTxType;
  session?: {
    origin: string;
    icon: string;
    name: string;
  };
  handleCancel?: () => void;
  handleConfirm?: () => void;
}

interface InscriptioinInfo {
  id: string;
  isSent: boolean;
}

function SignTxDetails({ txId, type }: { txId: string; type: BisonTxType }) {
  const address = useAccountAddress();

  const isCurrentToPayFee = useMemo(() => {
    if (type === BisonTxType.PEG_IN) {
      return false;
    } else {
      return true;
    }
  }, [type]);

  const feeAmount = 0; // TODO: Calculate for txn other than peg_in

  return (
    <Column gap="lg">
      <Text text="Sign Transaction" preset="title-bold" textCenter mt="lg" />
      <Row justifyCenter>
        <Card style={{ backgroundColor: '#272626', maxWidth: 320, width: 320 }}>
          <Column gap="lg">
            <Column>
              {/* {rawTxInfo && (
                <Column>
                  <Text text={'Send to'} textCenter color="textDim" />
                  <Row justifyCenter>
                    <AddressText addressInfo={rawTxInfo.toAddressInfo} textCenter />
                  </Row>
                </Column>
              )}
              {rawTxInfo && <Row style={{ borderTopWidth: 1, borderColor: colors.border }} my="md" />} */}

              <Column>
                <Text text={'Spend Amount'} textCenter color="textDim" />

                <Column justifyCenter>
                  {/* <Text text={spendAmount} color="white" preset="bold" textCenter size="xxl" /> */}
                  {isCurrentToPayFee && <Text text={`${feeAmount} (network fee)`} preset="sub" textCenter />}
                </Column>
              </Column>
            </Column>
          </Column>
        </Card>
      </Row>
    </Column>
  );
}

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

interface TxInfo {
  changedBalance: number;
  changedInscriptions: InscriptioinInfo[];
  rawtx: string;
  psbtHex: string;
  toSignInputs: ToSignInput[];
  txError: string;
  decodedPsbt: DecodedPsbt;
  isScammer: boolean;
}

const initTxInfo: TxInfo = {
  changedBalance: 0,
  changedInscriptions: [],
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
    inscriptions: {}
  }
};

export default function SignBIP322({ header, txId, type, session, handleCancel, handleConfirm }: Props) {
  const [resolveApproval, rejectApproval] = useApproval();

  const [txInfo, setTxInfo] = useState<TxInfo>(initTxInfo);

  const prepareSendBTC = usePrepareSendBTCCallback();
  const prepareSendOrdinalsInscriptions = usePrepareSendOrdinalsInscriptionsCallback();

  const wallet = useWallet();
  const [loading, setLoading] = useState(true);

  const tools = useTools();

  const address = useAccountAddress();
  const currentAccount = useCurrentAccount();

  const [isWarningVisible, setIsWarningVisible] = useState(false);

  const init = async () => {
    // call signing method from openapifile
    wallet.bridgeBTCToBison(txId);
    // TODO: method in wallet to retrieve signed message
    // method for enqueue peg in on button click instead of useeffect

    // let txError = '';
    // if (type === TxType.SEND_BITCOIN) {
    //   if (!psbtHex && toAddress && satoshis) {
    //     try {
    //       const rawTxInfo = await prepareSendBTC({
    //         toAddressInfo: { address: toAddress, domain: '' },
    //         toAmount: satoshis,
    //         feeRate,
    //         enableRBF: false
    //       });
    //       psbtHex = rawTxInfo.psbtHex;
    //     } catch (e) {
    //       console.log(e);
    //       txError = (e as any).message;
    //       tools.toastError(txError);
    //     }
    //   }
    // }

    // const { isScammer } = await wallet.checkWebsite(session?.origin || '');

    // setTxInfo({
    //   decodedPsbt,
    //   changedBalance: 0,
    //   changedInscriptions: [],
    //   psbtHex,
    //   rawtx: '',
    //   toSignInputs,
    //   txError,
    //   isScammer
    // });

    setLoading(false);
  };

  useEffect(() => {
    init();
  }, []);

  if (!handleCancel) {
    handleCancel = () => {
      rejectApproval();
    };
  }

  if (!handleConfirm) {
    handleConfirm = () => {
      resolveApproval();
    };
  }

  const detailsComponent = useMemo(() => {
    return <SignTxDetails txId={txId} type={type} />;
  }, [txInfo]);

  const isValid = useMemo(() => {
    if (txInfo.toSignInputs.length == 0) {
      return false;
    }
    if (txInfo.decodedPsbt.inputInfos.length == 0) {
      return false;
    }
    return true;
  }, [txInfo.decodedPsbt, txInfo.toSignInputs]);

  const hasHighRisk = useMemo(() => {
    if (txInfo && txInfo.decodedPsbt) {
      return txInfo.decodedPsbt.risks.find((v) => v.level === 'high') ? true : false;
    } else {
      return false;
    }
  }, [txInfo]);

  if (loading) {
    return (
      <Layout>
        <Content itemsCenter justifyCenter>
          <Icon size={fontSizes.xxxl} color="kondor_primary">
            <LoadingOutlined />
          </Icon>
        </Content>
      </Layout>
    );
  }

  if (!header && session) {
    header = (
      <Header>
        <WebsiteBar session={session} />
      </Header>
    );
  }

  return (
    <Layout>
      {header}
      <Content>
        <Column gap="xl">
          {detailsComponent}
          <Section title="PSBT Data:">
            <Text text={shortAddress(txInfo.psbtHex, 10)} />
            <Row
              itemsCenter
              onClick={(e) => {
                copyToClipboard(txInfo.psbtHex).then(() => {
                  tools.toastSuccess('Copied');
                });
              }}>
              <Text text={`${txInfo.psbtHex.length / 2} bytes`} color="textDim" />
              <Icon icon="copy" color="textDim" />
            </Row>
          </Section>
        </Column>
      </Content>

      <Footer>
        <Row full>
          <Button preset="default" text="Reject" onClick={handleCancel} full />
          {hasHighRisk == false && (
            <Button
              preset="primary"
              text={type == BisonTxType.PEG_IN ? 'Sign' : 'Sign & Pay'}
              onClick={handleConfirm}
              disabled={isValid == false}
              full
            />
          )}
        </Row>
      </Footer>
      {isWarningVisible && (
        <WarningPopover
          risks={txInfo.decodedPsbt.risks}
          onClose={() => {
            setIsWarningVisible(false);
          }}
        />
      )}
    </Layout>
  );
}
