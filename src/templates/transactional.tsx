import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface TransactionalEmailProps {
  subject: string
  body: string
}

export default function TransactionalEmail({
  subject,
  body,
}: TransactionalEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{subject.slice(0, 90)}</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#ffffff' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
          <Text style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px' }}>
            {subject}
          </Text>
          <Text style={{ fontSize: '16px', lineHeight: '1.6' }}>{body}</Text>
        </Container>
      </Body>
    </Html>
  )
}
