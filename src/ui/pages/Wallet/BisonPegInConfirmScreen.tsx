import { useLocation } from 'react-router-dom';

import { BisonTransactionMethod, RawTxInfo } from '@/shared/types';
import { Header } from '@/ui/components';
import { usePushBitcoinTxCallback } from '@/ui/state/transactions/hooks';
import { useLocationState } from '@/ui/utils';

import { useAccountAddress } from '@/ui/state/accounts/hooks';
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
  const address = useAccountAddress()
  const { rawtx, inputAmount, toAddress, tick, l1fee } = state as {
    rawtx: string;
    inputAmount: number;
    toAddress: string;
    tick: string;
    l1fee: number;
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
      senderAddress={address}
      receiverAddress={toAddress}
      tick={tick}
      l1fee={l1fee}
      type={BisonTransactionMethod.PEG_IN}
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
