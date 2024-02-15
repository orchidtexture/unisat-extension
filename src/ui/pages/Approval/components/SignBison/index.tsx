import React, { useEffect, useMemo, useState } from 'react';

import { BisonSequencerPegInMessage, BisonTxType, DecodedPsbt, SignedTransferTxn, ToSignInput } from '@/shared/types';
import { Button, Card, Column, Content, Footer, Header, Icon, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { CopyableAddress } from '@/ui/components/CopyableAddress';
import { WarningPopover } from '@/ui/components/WarningPopover';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { useNavigate } from '@/ui/pages/MainRoute';
import { usePushBitcoinTxCallback } from '@/ui/state/transactions/hooks';
import { fontSizes } from '@/ui/theme/font';
import { satoshisToAmount, useApproval, useWallet } from '@/ui/utils';
import { LoadingOutlined } from '@ant-design/icons';

interface Props {
  header?: React.ReactNode;
  rawtx?: string; // required in PEG IN
  fee?: number; // required in PEG IN
  senderAddress?: string; // required in TRANSFER
  receiverAddress?: string; // required in TRANSFER and PEG IN
  amount?: number; // required in TRANSFER and PEG IN
  gasEstimated?: number; // required in TRANSFER
  gasEstimatedHash?: string; // required in TRANSFER
  tick?: string; // required in TRANSFER and PEG IN
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

function PegInDetailsComponent({
  receiverAddress,
  amount,
  tick,
  fee
}: {
  receiverAddress: string;
  amount: number;
  tick: string | null;
  fee: number;
}) {
  return (
    <Card mt="lg" style={{ display: 'block' }}>
      <Row justifyBetween my="xl">
        <Text text="Vault Address" color="textDim" />
        <CopyableAddress address={receiverAddress || ''} />
      </Row>
      <Row justifyBetween my="xl">
        <Text text="Asset" color="textDim" />
        <Text text={tick?.toUpperCase()} size="sm" preset="bold" color="textDim" />
      </Row>
      <Row justifyBetween my="xl">
        <Text text="L1 fee" color="textDim" />
        <Text text={`${satoshisToAmount(fee)} ${tick?.toUpperCase()}`} size="sm" preset="bold" color="textDim" />
      </Row>
      <Row justifyBetween my="xl">
        <Text text="Amount" color="textDim" />
        <Text
          text={`${satoshisToAmount(amount || 0)} ${tick?.toUpperCase()}`}
          size="sm"
          preset="bold"
          color="textDim"
        />
      </Row>
      <Row justifyBetween my="xl">
        <Text text="Total" color="textDim" />
        <Text
          text={`${satoshisToAmount(amount + fee || 0)} ${tick?.toUpperCase()}`}
          size="sm"
          preset="bold"
          color="textDim"
        />
      </Row>
    </Card>
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
  rawtx,
  senderAddress,
  receiverAddress,
  amount,
  tick,
  fee,
  tokenContractAddress,
  gasEstimated,
  gasEstimatedHash,
  type,
  session,
  handleCancel,
  handleConfirm
}: Props) {
  const [resolveApproval, rejectApproval] = useApproval();
  const navigate = useNavigate();
  const pushBitcoinTx = usePushBitcoinTxCallback();
  const [txInfo, setTxInfo] = useState<TxInfo>(initTxInfo);
  const [signedTxn, setSignedTxn] = useState<BisonSequencerPegInMessage | null>(null);
  const [signedTransferTxn, setSignedTransferTxn] = useState<SignedTransferTxn | null>(null);

  const wallet = useWallet();
  const [loading, setLoading] = useState(true);

  const tools = useTools();

  const [isWarningVisible, setIsWarningVisible] = useState(false);

  const handleConfirmTransfer = async (txn: SignedTransferTxn) => {
    try {
      const res = await wallet.enqueueTransferTxn(txn);
      navigate('TxSuccessScreen', { txid: res.tx_hash });
    } catch (error) {
      navigate('TxFailScreen', { error });
    }
  };

  const handleConfirmPegIn = async () => {
    const { success, txid, error } = await pushBitcoinTx(rawtx as string);
    // const success = true;
    // const error = '';
    if (success) {
      // const txid = 'c609ce15d8409c62293e3e5a4f1c77f6a3ef7dd1950c1f6cf21e2cbedee4fa1d';
      try {
        const signedTxn = await wallet.b_signBridgeBtcToBisonTxn(txid);
        console.log(signedTxn);
        const res = await wallet.enqueuePegInTxn(signedTxn);
        console.log(res);
        navigate('TxSuccessScreen', { txid: txid });
        // navigate('TxSuccessScreen', { txid: '12345' });
      } catch (error) {
        navigate('TxFailScreen', { error });
      }
    } else {
      navigate('TxFailScreen', { error });
    }
  };

  const init = async () => {
    switch (type) {
      case BisonTxType.PEG_IN: {
        // if (!txId) throw new Error('txId is required in PEG_IN type');
        // const signedTxn = await wallet.b_signBridgeBtcToBisonTxn(txId);
        // setSignedTxn(signedTxn);
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
          !tokenContractAddress
        ) {
          throw new Error('Invalid params in TRANSFER type');
        }
        const signedTxn = await wallet.b_signTransferTxn({
          senderAddress,
          receiverAddress,
          amount,
          tokenContractAddress,
          tick,
          gasEstimated,
          gasEstimatedHash
        });
        setSignedTransferTxn(signedTxn);
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

  const handleOnClick = () => {
    switch (type) {
      case BisonTxType.PEG_IN:
        // if (!signedTxn) throw new Error('txn not signed yet');
        handleConfirmPegIn();
        break;
      default:
        if (!signedTransferTxn) throw new Error('txn not signed yet');
        handleConfirmTransfer(signedTransferTxn);
        break;
    }
  };

  return (
    <Layout>
      {header}
      <Content>
        <Column gap="xl">
          {type === BisonTxType.PEG_IN ? (
            <PegInDetailsComponent tick={tick} amount={amount} receiverAddress={receiverAddress} fee={fee} />
          ) : (
            <Card mt="lg" style={{ display: 'block' }}>
              <Row justifyBetween my="xl">
                <Text text="From" color="textDim" />
                <CopyableAddress address={signedTransferTxn?.sAddr || ''} />
              </Row>
              <Row justifyBetween my="xl">
                <Text text="To" color="textDim" />
                <CopyableAddress address={signedTransferTxn?.rAddr || ''} />
              </Row>
              <Row justifyBetween my="xl">
                <Text text="Token Contract Address" color="textDim" />
                <CopyableAddress address={signedTransferTxn?.tokenContractAddress || ''} />
              </Row>
              <Row justifyBetween my="xl">
                <Text text="Asset" color="textDim" />
                <Text text={signedTransferTxn?.tick.toUpperCase()} size="sm" preset="bold" color="textDim" />
              </Row>
              <Row justifyBetween my="xl">
                <Text text="Fee" color="textDim" />
                <Text
                  text={satoshisToAmount(signedTransferTxn?.gas_estimated || 0)}
                  size="sm"
                  preset="bold"
                  color="textDim"
                />
              </Row>
              <Row justifyBetween my="xl">
                <Text text="Amount" color="textDim" />
                <Text
                  text={`${satoshisToAmount(signedTransferTxn?.amt || 0)} ${signedTransferTxn?.tick.toUpperCase()}`}
                  size="sm"
                  preset="bold"
                  color="textDim"
                />
              </Row>
            </Card>
          )}
        </Column>
      </Content>

      <Footer>
        <Row full>
          <Button preset="default" text="Reject" onClick={handleCancel} full />
          {hasHighRisk == false && (
            <Button
              preset="primary"
              text={type == BisonTxType.PEG_IN ? 'Confirm' : 'Confirm & Pay'}
              onClick={handleOnClick}
              disabled={!rawtx && !signedTransferTxn}
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
