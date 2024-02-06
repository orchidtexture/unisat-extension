import { BisonTxType, RawTxInfo } from '@/shared/types';
import { Header } from '@/ui/components';
import { usePushBitcoinTxCallback } from '@/ui/state/transactions/hooks';
import { useLocationState } from '@/ui/utils';
import { useLocation } from 'react-router-dom';
import SignBIP322 from '../Approval/components/SignBison';
import { useNavigate } from '../MainRoute';

interface LocationState {
 rawTxInfo: RawTxInfo;
}

export interface ToSignInput {
  index: number;
  publicKey: string;
  sighashTypes?: number[];
}

export default function TxBisonConfirmScreen() {
  const navigate = useNavigate()
  console.log('txBisonConfirmScreen')
  const { rawTxInfo } = useLocationState<LocationState>();
  const pushBitcoinTx = usePushBitcoinTxCallback();
  const { state } = useLocation();
  const { txId } = state as {
    txId: string;
  };
  return (
    <SignBIP322
      header=<Header
        onBack={() => {
          window.history.go(-1);
        }}
      />
      txId={txId}
      type={BisonTxType.TRANSFER}
      handleCancel={() => {
        window.history.go(-1);
      }}
      handleConfirm={() => {
        pushBitcoinTx(rawTxInfo.rawtx).then(({ success, txid, error }) => {
          if (success) {
            navigate('TxSuccessScreen', { txid });
          } else {
            navigate('TxFailScreen', { error });
          }
        });
      }}
    />
  )}
