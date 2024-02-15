import { Tooltip } from 'antd';

import { BisonBalance } from '@/shared/types';
import { colors } from '@/ui/theme/colors';
import { fontSizes } from '@/ui/theme/font';
import { satoshisToAmount } from '@/ui/utils';
import { InfoCircleOutlined } from '@ant-design/icons';

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
        minHeight: 60
      }}
      fullX
      onClick={onClick}>
      <Column full>
        <Row justifyBetween itemsCenter>
          <Text text={ticker} color="zky_primary" />
          <Tooltip
            title="The transferable amount is the balance that has been inscribed into transfer inscriptions but has not yet been sent."
            overlayStyle={{
              fontSize: fontSizes.xs
            }}>
            <InfoCircleOutlined
              style={{
                fontSize: fontSizes.xs,
                color: colors.textDim
              }}
            />
          </Tooltip>
        </Row>
        <Row style={{ borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
        <Row justifyBetween itemsCenter>
          <Text text="Balance:" color="textDim" size="xs" />
          <Text text={satoshisToAmount(balance)} size="xs" />
        </Row>
      </Column>
    </Card>
  );
}
