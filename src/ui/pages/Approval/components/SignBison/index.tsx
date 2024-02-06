import React, { useEffect, useMemo, useState } from 'react';

import { BisonTxType, DecodedPsbt, SignedTransferTxn, ToSignInput } from '@/shared/types';
import { Button, Card, Column, Content, Footer, Header, Icon, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { WarningPopover } from '@/ui/components/WarningPopover';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { useNavigate } from '@/ui/pages/MainRoute';
import { fontSizes } from '@/ui/theme/font';
import { copyToClipboard, shortAddress, useApproval, useWallet } from '@/ui/utils';
import { LoadingOutlined } from '@ant-design/icons';

interface Props {
  header?: React.ReactNode;
  txId?: string; // required in PEG IN
  senderAddress?: string; // required in TRANSFER
  receiverAddress?: string; // required in TRANSFER
  amount?: number; // required in TRANSFER
  gasEstimated?: number; // required in TRANSFER
  gasEstimatedHash?: string; // required in TRANSFER
  tick?: string; // required in TRANSFER
  tokenContractAddress?: string; // required in TRANSFER
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

export default function SignBIP322({
  header,
  txId,
  senderAddress,
  receiverAddress,
  amount,
  tick,
  tokenContractAddress,
  gasEstimated,
  gasEstimatedHash,
  type,
  session,
  handleCancel,
  handleConfirm }: Props) {
  console.log('senderAddress', senderAddress);
  console.log('receiverAddress', receiverAddress);
  console.log('amount', amount);
  console.log('tick', tick);
  console.log('tokenContractAddress', tokenContractAddress);
  console.log('gasEstimated', gasEstimated);
  console.log('gasEstimatedHash', gasEstimatedHash);
  console.log('type', type);
  const [resolveApproval, rejectApproval] = useApproval();
  const navigate = useNavigate();
  const [txInfo, setTxInfo] = useState<TxInfo>(initTxInfo);
  const [signedTxn, setSignedTxn] = useState<boolean>(false);
  const [signedTransferTxn, setSignedTransferTxn] = useState<SignedTransferTxn | null>(null);

  const wallet = useWallet();
  const [loading, setLoading] = useState(true);

  const tools = useTools();

  const [isWarningVisible, setIsWarningVisible] = useState(false);

  const handleConfirmTransfer = async (txn: SignedTransferTxn) => {
    try {
      const res = await wallet.enqueueTransferTxn(txn)
      console.log(res)
      navigate('TxSuccessScreen', { txid: res.tx_hash });
    } catch(error){
      console.log('error sending txn', error)
      navigate('TxFailScreen', { error });
    }
  }

  console.log(signedTxn);

  const init = async () => {
    switch (type) {
      case BisonTxType.PEG_IN:{
        if (!txId) throw new Error('txId is required in PEG_IN type')
        const signedTxn = await wallet.b_signBridgeBtcToBisonTxn(txId);
        setSignedTxn(signedTxn);
        break;
      }
      case BisonTxType.TRANSFER: {
        if (
          !senderAddress ||
          !receiverAddress ||
          !amount ||
          !gasEstimated ||
          !gasEstimatedHash ||
          !tick ||
          !tokenContractAddress) {
          throw new Error('Invalid params in TRANSFER type')
        }
        const signedTxn = await wallet.b_signTransferTxn({
          senderAddress,
          receiverAddress,
          amount,
          tokenContractAddress,
          tick,
          gasEstimated,
          gasEstimatedHash
        })
        console.log('signedTxn', signedTxn)
        setSignedTransferTxn(signedTxn);
        setSignedTxn(true);
      }
    }
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
    if (type === BisonTxType.PEG_IN) {
      if (!txId) throw Error('Invalid parameter txId')
      return <SignTxDetails txId={txId} type={type} />;
    }
  }, [txInfo]);

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
          {type === BisonTxType.PEG_IN
            ? detailsComponent
            : (<><Section title='from'>
              <Text>{signedTransferTxn?.sAddr}</Text>
            </Section>
            <Section title='to'>
              <Text>{signedTransferTxn?.rAddr}</Text>
            </Section>
            <Section title='fee'>
              <Text>{signedTransferTxn?.gas_estimated}</Text>
            </Section>
            <Section title='token'>
              <Text>{signedTransferTxn?.tick}</Text>
            </Section>
            <Section title='amount'>
              <Text>{signedTransferTxn?.amt}</Text>
            </Section></>)
          }
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
              text={type == BisonTxType.PEG_IN ? 'Confirm' : 'Confirm & Pay'}
              onClick={type === BisonTxType.PEG_IN ? handleConfirm : () => {
                if(!signedTransferTxn) throw new Error('txn not signed yet')
                handleConfirmTransfer(signedTransferTxn)
              }}
              disabled={!signedTxn}
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
