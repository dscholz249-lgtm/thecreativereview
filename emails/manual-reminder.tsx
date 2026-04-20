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
  deadline: string | null;
};

type Props = {
  workspaceName: string;
  projectName: string;
  pendingItems: PendingItem[];
  inboxUrl: string;
};

export default function ManualReminderEmail({
  workspaceName,
  projectName,
  pendingItems,
  inboxUrl,
}: Props) {
  const count = pendingItems.length;
  return (
    <Html>
      <Head />
      <Preview>{`${workspaceName} is waiting on your review`}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Heading style={s.heading}>A quick nudge from {workspaceName}</Heading>
          <Text style={s.paragraph}>
            You have {count} asset{count === 1 ? "" : "s"} pending on{" "}
            <strong>{projectName}</strong>:
          </Text>
          <Section>
            {pendingItems.map((item, i) => (
              <Text key={i} style={s.listItem}>
                <strong>{item.assetName}</strong>
                {item.deadline ? ` — due ${item.deadline}` : ""}
              </Text>
            ))}
          </Section>
          <Section style={s.buttonSection}>
            <Button href={inboxUrl} style={s.button}>
              Open my reviews
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
