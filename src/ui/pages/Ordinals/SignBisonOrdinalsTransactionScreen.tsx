import { useLocation } from 'react-router-dom';

import { BisonTransactionMethod, BuildBisonTxnParams } from '@/shared/types';
import { Header } from '@/ui/components';

import SignBIP322 from '../Approval/components/SignBison';

export interface ToSignInput {
  index: number;
  publicKey: string;
  sighashTypes?: number[];
}

export default function SignBisonOrdinalsTransactionScreen() {
  const { state } = useLocation();
  const { rawTx } = state as {
    rawTx: BuildBisonTxnParams;
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
      senderAddress={rawTx.senderAddress}
      receiverAddress={rawTx.receiverAddress}
      tick={rawTx.tick}
      tokenContractAddress={rawTx.tokenContractAddress}
      type={BisonTransactionMethod.INSCRIPTION_TRANSFER}
      inscriptionId={rawTx.inscription}
      inscriptionData={rawTx.inscriptionData}
      amount={rawTx.amount}
      handleCancel={() => {
        window.history.go(-1);
      }}
    />
  );
}
