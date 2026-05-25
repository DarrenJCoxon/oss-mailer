import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Text,
  Link,
} from '@react-email/components'

interface MagicLinkEmailProps {
  url: string
}

export default function MagicLinkEmail({ url }: MagicLinkEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Your magic link — click to sign in</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#ffffff' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
          <Text style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px' }}>
            Sign in to your account
          </Text>
          <Text style={{ fontSize: '16px', lineHeight: '1.5', marginBottom: '24px' }}>
            Click the link below to sign in. This link expires in 15 minutes and can only be used once.
          </Text>
          <Link
            href={url}
            style={{
              display: 'inline-block',
              backgroundColor: '#0070f3',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '4px',
              textDecoration: 'none',
              fontSize: '16px',
            }}
          >
            Sign in
          </Link>
          <Text style={{ fontSize: '14px', color: '#666666', marginTop: '24px' }}>
            If you did not request this link, you can safely ignore this message.
          </Text>
          <Text style={{ fontSize: '12px', color: '#999999', marginTop: '8px' }}>
            Or copy and paste this URL into your browser: {url}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
