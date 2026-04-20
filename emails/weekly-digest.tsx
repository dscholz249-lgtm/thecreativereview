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

type PendingItem = {
  assetName: string;
  projectName: string;
  deadline: string | null;
};

type Props = {
  reviewerName: string | null;
  items: PendingItem[];
  inboxUrl: string;
};

export default function WeeklyDigestEmail({
  reviewerName,
  items,
  inboxUrl,
}: Props) {
  const count = items.length;
  const preview =
    count === 0
      ? "You're all caught up"
      : `${count} asset${count === 1 ? "" : "s"} waiting on you`;
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Heading style={s.heading}>
            {reviewerName ? `Hi ${reviewerName},` : "Your weekly review queue"}
          </Heading>
          <Text style={s.paragraph}>
            {count === 0
              ? "Nothing pending on your plate this week."
              : `You have ${count} asset${count === 1 ? "" : "s"} waiting on a decision:`}
          </Text>
          {items.length > 0 ? (
            <Section>
              {items.map((item, i) => (
                <Text key={i} style={s.listItem}>
                  <strong>{item.assetName}</strong> — {item.projectName}
                  {item.deadline ? ` · due ${item.deadline}` : ""}
                </Text>
              ))}
            </Section>
          ) : null}
          <Section style={s.buttonSection}>
            <Button href={inboxUrl} style={s.button}>
              {count === 0 ? "Open your inbox" : "Go to my reviews"}
            </Button>
          </Section>
          <Text style={s.footer}>
            Weekly digests arrive Friday around noon your local time.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
