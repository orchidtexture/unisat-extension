import { copyToClipboard, shortAddress } from '@/ui/utils';
import { CopyOutlined } from '@ant-design/icons';
import { useTools } from '../ActionComponent';
import { Row } from '../Row';
import { Text } from '../Text';


export function CopyableAddress({ address }: { address: string }) {
  const tools = useTools();
  return (
    <Row
      itemsCenter
      gap="sm"
      onClick={(e) => {
        copyToClipboard(address).then(() => {
          tools.toastSuccess('Copied');
        });
      }}>
      <Text text={shortAddress(address)} color="textDim" />
      <CopyOutlined style={{color:'#888',fontSize:14}}/>
    </Row>
  );
}
