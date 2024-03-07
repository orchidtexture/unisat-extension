import { Button, Card, Column, Content, Footer, Header, Layout, Row, Text } from '@/ui/components';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { useApproval } from '@/ui/utils';

interface Props {
  params: {
    data: {
      messages: string[];
    };
    session: {
      origin: string;
      icon: string;
      name: string;
    };
  };
}
export default function SignTexts({ params: { data, session } }: Props) {
  console.log(data);
  const [getApproval, resolveApproval, rejectApproval] = useApproval();

  const handleCancel = () => {
    rejectApproval();
  };

  const handleConfirm = () => {
    resolveApproval();
  };
  return (
    <Layout>
      <Content>
        <Header>
          <WebsiteBar session={session} />
        </Header>
        <Column>
          <Text text="Multiple signatures request" preset="title-bold" textCenter mt="lg" />
          <Text
            text="Only sign this messages if you fully understand the content and trust the requesting site."
            preset="sub"
            textCenter
            mt="lg"
          />
          <Text text="You are signing:" textCenter mt="lg" />

          {data.messages.map((text) => (
            <Card key={text}>
              <div
                style={{
                  userSelect: 'text',
                  maxHeight: 384,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  flexWrap: 'wrap'
                }}>
                {text}
              </div>
            </Card>
          ))}
        </Column>
      </Content>

      <Footer>
        <Row full>
          <Button text="Reject" full preset="default" onClick={handleCancel} />
          <Button text="Sign All" full preset="primary" onClick={handleConfirm} />
        </Row>
      </Footer>
    </Layout>
  );
}
