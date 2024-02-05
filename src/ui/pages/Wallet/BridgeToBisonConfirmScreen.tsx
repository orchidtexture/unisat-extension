import { useLocation } from 'react-router-dom';

import { BisonTxType, RawTxInfo } from '@/shared/types';
import { Header } from '@/ui/components';
import { usePushBitcoinTxCallback } from '@/ui/state/transactions/hooks';
import { useLocationState } from '@/ui/utils';

import SignBIP322 from '../Approval/components/SignBison';
import { useNavigate } from '../MainRoute';

interface LocationState {
  rawTxInfo: RawTxInfo;
}

export default function BridgeToBisonConfirmScreen() {
  const { rawTxInfo } = useLocationState<LocationState>();
  const navigate = useNavigate();
  const pushBitcoinTx = usePushBitcoinTxCallback();
  const { state } = useLocation();
  const { txId } = state as {
    txId: string;
  };
  console.log(txId);
  return (
    <SignBIP322
      header=<Header
        onBack={() => {
          window.history.go(-1);
        }}
      />
      txId={txId}
      type={BisonTxType.PEG_IN}
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
  );
}
