import { BisonBalance } from '@/shared/types';
import { satoshisToAmount } from '@/ui/utils';

import { Card } from '../Card';
import { Column } from '../Column';
import { Row } from '../Row';
import { Text } from '../Text';

export interface BisonBalanceCardProps {
  bisonBalance: BisonBalance;
  onClick?: () => void;
}

export default function BisonBalanceCard(props: BisonBalanceCardProps) {
  const {
    bisonBalance: { ticker, balance },
    onClick
  } = props;
  return (
    <Card
      style={{
        backgroundColor: '#10171A',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        minHeight: 40
      }}
      fullX
      onClick={onClick}>
      <Column full>
        <Row justifyBetween itemsCenter>
          <Text text={ticker} color="zky_primary" />
          <Text text={satoshisToAmount(balance)} size="xs" />
        </Row>
      </Column>
    </Card>
  );
}
