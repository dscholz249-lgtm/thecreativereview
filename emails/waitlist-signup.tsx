import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import * as s from "./_shared";

// Internal notification — lands in info@thecreativereview.app when someone
// signs up on /welcome. Plain table of the captured fields; Reply-To is
// the signup email so responding goes straight to them.

type Props = {
  name: string;
  email: string;
  agency: string | null;
};

export default function WaitlistSignupEmail({ name, email, agency }: Props) {
  return (
    <Html>
      <Head />
      <Preview>{`New waitlist signup: ${name}${agency ? ` (${agency})` : ""}`}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Heading style={s.heading}>New waitlist signup</Heading>
          <Text style={s.paragraph}>
            Someone just dropped their details on the /welcome page.
          </Text>
          <Text style={s.listItem}>
            <strong>Name:</strong> {name}
          </Text>
          <Text style={s.listItem}>
            <strong>Email:</strong> {email}
          </Text>
          {agency ? (
            <Text style={s.listItem}>
              <strong>Agency:</strong> {agency}
            </Text>
          ) : null}
          <Text style={s.small}>
            Hit reply to respond directly. The signup is also stored in
            notifications (kind=&apos;waitlist_signup&apos;) in Supabase.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
