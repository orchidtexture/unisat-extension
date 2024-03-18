import { BISON_DEFAULT_TOKEN, BisonTransactionMethod, DecodedPsbt, Inscription, ToSignInput } from '@/shared/types';
import { Button, Card, Column, Content, Footer, Header, Icon, Layout, Row, Text } from '@/ui/components';
import { CopyableAddress } from '@/ui/components/CopyableAddress';
import InscriptionPreview from '@/ui/components/InscriptionPreview';
import { WarningPopover } from '@/ui/components/WarningPopover';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { useNavigate } from '@/ui/pages/MainRoute';
import { useAccountAddress } from '@/ui/state/accounts/hooks';
import { usePushBitcoinTxCallback } from '@/ui/state/transactions/hooks';
import { fontSizes } from '@/ui/theme/font';
import { satoshisToAmount, useApproval, useWallet } from '@/ui/utils';
import { LoadingOutlined } from '@ant-design/icons';
import React, { useEffect, useMemo, useState } from 'react';

interface Props {
  header?: React.ReactNode;
  rawtx?: string; // required in PEG IN
  l1fee?: number; // required in PEG IN
  senderAddress?: string; // required in TRANSFER
  receiverAddress?: string; // required in TRANSFER and PEG IN
  amount?: number; // required in TRANSFER and PEG IN
  gasEstimated?: number; // required in TRANSFER
  gasEstimatedHash?: string; // required in TRANSFER
  tick?: string; // required in TRANSFER and PEG IN
  tokenContractAddress?: string; // required in TRANSFER
  type: BisonTransactionMethod;
  inscriptionId?: string; // required in INSCRIPTION_TRANSFER
  inscriptionData?: Inscription; // required in INSCRIPTION_TRANSFER
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
  l1fee
}: {
  receiverAddress: string;
  amount: number;
  tick: string | null;
  l1fee: number;
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
        <Text text={`${satoshisToAmount(l1fee)} ${tick?.toUpperCase()}`} size="sm" preset="bold" color="textDim" />
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
          text={`${satoshisToAmount(amount + l1fee || 0)} ${tick?.toUpperCase()}`}
          size="sm"
          preset="bold"
          color="textDim"
        />
      </Row>
    </Card>
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
  l1fee,
  tokenContractAddress,
  type,
  inscriptionId,
  inscriptionData,
  session,
  handleCancel,
  handleConfirm
}: Props) {
  const [resolveApproval, rejectApproval] = useApproval();
  const navigate = useNavigate();
  const pushBitcoinTx = usePushBitcoinTxCallback();
  const [txInfo, setTxInfo] = useState<TxInfo>(initTxInfo);
  const address = useAccountAddress();
  const wallet = useWallet();
  const [bisonFee, setBisonFee] = useState<number>(0)
  const [loading, setLoading] = useState(true);
  const [isWarningVisible, setIsWarningVisible] = useState(false);

  const handleConfirmTransfer = async () => {
    try {
      if (!senderAddress || !receiverAddress || !tick || !amount) throw new Error('invalid paramerts to send')
      const res = await wallet.sendBisonTransaction({
        method: BisonTransactionMethod.TRANSFER,
        senderAddress,
        receiverAddress,
        amount,
        tick,
        tokenContractAddress
      });
      navigate('TxSuccessScreen', { txid: res.txId });
    } catch (error) {
      navigate('TxFailScreen', { error });
    }
  };

  const handleConfirmInscriptionTransfer = async () => {
    try {
      if (!senderAddress || !receiverAddress || !tick || !amount || !inscriptionId) throw new Error('invalid paramerts to send')
      const res = await wallet.sendBisonTransaction({
        method: BisonTransactionMethod.INSCRIPTION_TRANSFER,
        senderAddress,
        receiverAddress,
        amount: Number(satoshisToAmount(amount)),
        tick,
        inscription: inscriptionId,
        tokenContractAddress
      });
      navigate('TxSuccessScreen', { txid: res.txId });
    } catch (error) {
      navigate('TxFailScreen', { error });
    }
  };


  const handleConfirmPegIn = async () => {
    const { success, txid, error } = await pushBitcoinTx(rawtx as string);
    if (success) {
      try {
        const res = await wallet.sendBisonTransaction({
          tick: BISON_DEFAULT_TOKEN,
          method: BisonTransactionMethod.PEG_IN,
          senderAddress: address,
          receiverAddress: address,
          l1txid: txid
        });
        navigate('TxSuccessScreen', { txid: res.txId });
      } catch (error) {
        navigate('TxFailScreen', { error });
      }
    } else {
      navigate('TxFailScreen', { error });
    }
  };

  const init = async () => {
    switch (type) {
      case BisonTransactionMethod.PEG_IN: {
        if (!rawtx || !l1fee) throw new Error('rawtx and l1Fee are required in PEG_IN type');
        break;
      }
      case BisonTransactionMethod.TRANSFER: {
        if (
          !senderAddress ||
          !receiverAddress ||
          !amount ||
          !tick ||
          !tokenContractAddress ||
          !amount
        ) {
          throw new Error('Invalid params in TRANSFER type');
        }
        const { gasEstimated } = await wallet.getBisonFeeSummary({
          method: BisonTransactionMethod.TRANSFER,
          senderAddress,
          receiverAddress,
          amount,
          tokenContractAddress,
          tick,
        });
        setBisonFee(gasEstimated);
        break;
      }
      case BisonTransactionMethod.INSCRIPTION_TRANSFER: {
        if (
          !senderAddress ||
          !receiverAddress ||
          !tick ||
          !tokenContractAddress ||
          !inscriptionId ||
          !amount
        ) {
          throw new Error('Invalid params in INSCRIPTION_TRANSFER type');
        }
        const { gasEstimated } = await wallet.getBisonFeeSummary({
          method: BisonTransactionMethod.INSCRIPTION_TRANSFER,
          senderAddress,
          receiverAddress,
          tokenContractAddress,
          inscription: inscriptionId,
          amount: Number(satoshisToAmount(amount)),
          tick,
        });
        setBisonFee(gasEstimated);
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
          <Icon size={fontSizes.xxxl} color="zky_primary">
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
      case BisonTransactionMethod.PEG_IN:
        handleConfirmPegIn();
        break;
      case BisonTransactionMethod.TRANSFER:
        handleConfirmTransfer();
        break;
      case BisonTransactionMethod.INSCRIPTION_TRANSFER:
        handleConfirmInscriptionTransfer();
        break;
    }
  };

  return (
    <Layout>
      {header}
      <Content>
        <Column gap="xl">
          {type === BisonTransactionMethod.PEG_IN ? (
            <PegInDetailsComponent tick={tick || BISON_DEFAULT_TOKEN} amount={amount || 0} receiverAddress={receiverAddress || '' } l1fee={l1fee || 0} />
          ) : (
            <Card mt="lg" style={{ display: 'block' }}>
              <Row justifyBetween my="xl">
                <Text text="From" color="textDim" />
                <CopyableAddress address={senderAddress || ''} />
              </Row>
              <Row justifyBetween my="xl">
                <Text text="To" color="textDim" />
                <CopyableAddress address={receiverAddress || ''} />
              </Row>
              <Row justifyBetween my="xl">
                <Text text="Token Contract Address" color="textDim" />
                <CopyableAddress address={tokenContractAddress || ''} />
              </Row>
              {inscriptionId ? (
                <Row justifyBetween my="xl">
                  <Text text="Inscription id" color="textDim" />
                  <CopyableAddress address={inscriptionId || ''} />
                </Row>
              ) : null}
              <Row justifyBetween my="xl">
                <Text text="Asset" color="textDim" />
                <Text text={tick?.toUpperCase()} size="sm" preset="bold" color="textDim" />
              </Row>
              <Row justifyBetween my="xl">
                <Text text="Fee" color="textDim" />
                <Text
                  text={satoshisToAmount(bisonFee || 0)}
                  size="sm"
                  preset="bold"
                  color="textDim"
                />
              </Row>
              <Row justifyBetween my="xl">
                <Text text="Amount" color="textDim" />
                <Text
                  text={`${amount} ${ type === BisonTransactionMethod.INSCRIPTION_TRANSFER ? 'sats' : tick?.toUpperCase()}`}
                  size="sm"
                  preset="bold"
                  color="textDim"
                />
              </Row>
              {type	=== BisonTransactionMethod.INSCRIPTION_TRANSFER ?
                (
                  <Row justifyBetween my="xl">
                    <InscriptionPreview key={inscriptionId} data={inscriptionData!} preset="small" />
                  </Row>
                ) : null}
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
              text={type !== BisonTransactionMethod.TRANSFER ? 'Confirm' : 'Confirm & Pay'}
              onClick={handleOnClick}
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
