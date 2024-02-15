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

export default function BisonPegInConfirmScreen() {
  const { rawTxInfo } = useLocationState<LocationState>();
  const navigate = useNavigate();
  const pushBitcoinTx = usePushBitcoinTxCallback();
  const { state } = useLocation();
  const { rawtx, inputAmount, toAddress, tick, fee } = state as {
    rawtx: string;
    inputAmount: number;
    toAddress: string;
    tick: string;
    fee: number;
  };
  return (
    <SignBIP322
      header=<Header
        onBack={() => {
          window.history.go(-1);
        }}
        title="Confirm transaction"
      />
      rawtx={rawtx}
      amount={inputAmount}
      receiverAddress={toAddress}
      tick={tick}
      fee={fee}
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
