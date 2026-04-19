import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type Props = {
  workspaceName: string;
  inviterName: string | null;
  signInUrl: string;
  firstProjectName?: string | null;
};

export default function ReviewerInviteEmail({
  workspaceName,
  inviterName,
  signInUrl,
  firstProjectName,
}: Props) {
  const from = inviterName ? `${inviterName} at ${workspaceName}` : workspaceName;
  return (
    <Html>
      <Head />
      <Preview>{`${from} invited you to review work in Creative Review`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>You&apos;ve been invited to review</Heading>
          <Text style={paragraph}>
            {from} wants your feedback on
            {firstProjectName ? ` "${firstProjectName}"` : " some creative work"}.
            One click signs you in — no password, no account to set up.
          </Text>
          <Section style={buttonSection}>
            <Button href={signInUrl} style={button}>
              Open my reviews
            </Button>
          </Section>
          <Text style={small}>
            Or paste this link into your browser:
            <br />
            <a href={signInUrl} style={link}>
              {signInUrl}
            </a>
          </Text>
          <Text style={footer}>
            This link signs in only your email. If you didn&apos;t expect this
            invitation, you can ignore the message.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#f7f7f5",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};
const container: React.CSSProperties = {
  margin: "0 auto",
  padding: "32px 24px",
  maxWidth: "560px",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  border: "1px solid #e5e4e0",
};
const heading: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 600,
  color: "#1a1a1a",
  margin: "0 0 12px",
};
const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "22px",
  color: "#3a3a3a",
  margin: "0 0 24px",
};
const buttonSection: React.CSSProperties = {
  textAlign: "center",
  margin: "32px 0",
};
const button: React.CSSProperties = {
  backgroundColor: "#1a1a1a",
  color: "#ffffff",
  padding: "12px 20px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: 500,
  textDecoration: "none",
  display: "inline-block",
};
const small: React.CSSProperties = {
  fontSize: "12px",
  color: "#6b6b6b",
  lineHeight: "18px",
  margin: "24px 0 8px",
};
const link: React.CSSProperties = {
  color: "#185fa5",
  wordBreak: "break-all",
};
const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#9c9c9c",
  lineHeight: "16px",
  marginTop: "24px",
};
