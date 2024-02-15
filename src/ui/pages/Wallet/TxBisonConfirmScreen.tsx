import { useLocation } from 'react-router-dom';

import { BisonGetFeeResponse, BisonTxType } from '@/shared/types';
import { Header } from '@/ui/components';

import SignBIP322 from '../Approval/components/SignBison';

export interface ToSignInput {
  index: number;
  publicKey: string;
  sighashTypes?: number[];
}

export default function TxBisonConfirmScreen() {
  const { state } = useLocation();
  const { rawTx } = state as {
    rawTx: BisonGetFeeResponse;
  };
  return (
    <SignBIP322
      header={
        <Header
          onBack={() => {
            window.history.go(-1);
          }}
          title="Confirm transaction"
        />
      }
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
  );
}
