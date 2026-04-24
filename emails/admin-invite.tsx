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
import * as s from "./_shared";

type Props = {
  workspaceName: string;
  inviterName: string | null;
  signInUrl: string;
};

// Admin-seat invite. Mirrors emails/reviewer-invite.tsx shape so the
// visual grammar is consistent, but the copy explains they're being
// added as an admin (not a reviewer), which unlocks different surfaces.

export default function AdminInviteEmail({
  workspaceName,
  inviterName,
  signInUrl,
}: Props) {
  const inviter = inviterName?.trim() || "The team";
  const subject = `${inviter} added you to ${workspaceName} on Creative Review`;
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Heading style={s.heading}>You&apos;re invited to {workspaceName}</Heading>
          <Text style={s.paragraph}>
            {inviter} added you as an admin on {workspaceName}. Admins can
            create clients, upload assets, invite reviewers, and manage the
            workspace.
          </Text>
          <Section style={s.buttonSection}>
            <Button href={signInUrl} style={s.button}>
              Accept invite
            </Button>
          </Section>
          <Text style={s.small}>
            This link stays active for 30 days. If you didn&apos;t expect
            this invite, you can ignore the email — nothing happens until
            you click the button.
          </Text>
          <Text style={s.footer}>
            Creative Review · invites.creative
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
