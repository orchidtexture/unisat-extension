import { BisonTransactionMethod, BuildBisonTxnParams, Inscription } from '@/shared/types';
import { Button, Column, Content, Header, Input, Layout, Row, Text } from '@/ui/components';
import InscriptionPreview from '@/ui/components/InscriptionPreview';
import {
  useOrdinalsTx
} from '@/ui/state/transactions/hooks';
import { isValidAddress, useWallet } from '@/ui/utils';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useAccountAddress } from '@/ui/state/accounts/hooks';
import { useNavigate } from '../MainRoute';

export default function SendBisonOrdinalsInscriptionScreen() {
  const [disabled, setDisabled] = useState(true);
  const navigate = useNavigate();
  const address = useAccountAddress()
  const [rawTx, setRawTx] = useState<BuildBisonTxnParams | null>(null)


  const { state } = useLocation();
  const { inscription } = state as {
    inscription: Inscription;
  };
  const ordinalsTx = useOrdinalsTx();
  const [toInfo, setToInfo] = useState({
    address: ordinalsTx.toAddress,
    domain: ordinalsTx.toDomain
  });

  const [error, setError] = useState('');
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);

  const wallet = useWallet();
  useEffect(() => {
    wallet.getInscriptionUtxoDetail(inscription.inscriptionId).then((v) => {
      setInscriptions(v.inscriptions);
    });
  }, []);

  useEffect(() => {
    setDisabled(true);
    setError('');

    if (!isValidAddress(toInfo.address)) {
      return;
    }

    setRawTx({
      method: BisonTransactionMethod.INSCRIPTION_TRANSFER,
      senderAddress: address,
      receiverAddress: toInfo.address,
      tick: 'inscription',
      tokenContractAddress: inscriptions[0].address,
      inscription: inscriptions[0].inscriptionId,
      amount: inscriptions[0].outputValue,
      inscriptionData: inscriptions[0]
    })
    setDisabled(false);
    return;
  }, [toInfo, inscriptions]);

  return (
    <Layout>
      <Header
        onBack={() => {
          window.history.go(-1);
        }}
        title="Send Inscription"
      />
      <Content>
        <Column>
          <Text text={`Ordinals Inscriptions (${inscriptions.length})`} color="textDim" />
          <Row justifyBetween>
            <Row overflowX gap="lg" pb="md">
              {inscriptions.map((v) => (
                <InscriptionPreview key={v.inscriptionId} data={v} preset="small" />
              ))}
            </Row>
          </Row>

          <Text text="Recipient" color="textDim" />

          <Input
            preset="address"
            addressInputData={toInfo}
            autoFocus={true}
            onAddressInputChange={(val) => {
              setToInfo(val);
            }}
          />

          {error && <Text text={error} color="error" />}
          <Button
            disabled={disabled}
            preset="primary"
            text="Next"
            onClick={(e) => {
              navigate('SignBisonOrdinalsTransactionScreen', { rawTx });
            }}
          />
        </Column>
      </Content>
    </Layout>
  );
}
