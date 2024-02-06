import { BisonGetFeeResponse, BisonTxType } from '@/shared/types';
import { Header } from '@/ui/components';
import { useLocation } from 'react-router-dom';
import SignBIP322 from '../Approval/components/SignBison';

export interface ToSignInput {
  index: number;
  publicKey: string;
  sighashTypes?: number[];
}

export default function TxBisonConfirmScreen() {
  console.log('txBisonConfirmScreen')
  const { state } = useLocation();
  const { rawTx } = state as {
    rawTx: BisonGetFeeResponse;
  };
  console.log('rawTx: ',rawTx)
  return (
    <SignBIP322
      header={<Header
        onBack={() => {
          window.history.go(-1);
        }}
      />}
      senderAddress={rawTx.sAddr}
      receiverAddress={rawTx.rAddr}
      gasEstimated={rawTx.gas_estimated}
      gasEstimatedHash={rawTx.gas_estimated_hash}
      amount={rawTx.amt}
      tick={rawTx.tick}
      tokenContractAddress={rawTx.tokenContractAddress}
      type={BisonTxType.TRANSFER}
      handleCancel={() => {
        window.history.go(-1);
      }}
    />
  )}
