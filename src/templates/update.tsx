import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Text,
  Link,
} from '@react-email/components'

interface UpdateEmailProps {
  subject: string
  body: string
  unsubscribeUrl: string
}

export default function UpdateEmail({
  subject,
  body,
  unsubscribeUrl,
}: UpdateEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{subject.slice(0, 90)}</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#ffffff' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
          <Text style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px' }}>
            {subject}
          </Text>
          <Text style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '32px' }}>
            {body}
          </Text>
          <Text style={{ fontSize: '12px', color: '#999999', borderTop: '1px solid #eeeeee', paddingTop: '16px', marginTop: '32px' }}>
            You received this message because you opted in to updates.{' '}
            <Link href={unsubscribeUrl} style={{ color: '#999999' }}>
              Unsubscribe
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
