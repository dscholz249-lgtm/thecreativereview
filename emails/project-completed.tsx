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
  projectName: string;
  clientName: string;
  approvedCount: number;
  projectUrl: string;
};

export default function ProjectCompletedEmail({
  projectName,
  clientName,
  approvedCount,
  projectUrl,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>{`${projectName} is complete`}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Heading style={s.heading}>{projectName} is complete</Heading>
          <Text style={s.paragraph}>
            Every non-archived asset in <strong>{projectName}</strong> (for{" "}
            {clientName}) has been approved. {approvedCount} asset
            {approvedCount === 1 ? "" : "s"} total.
          </Text>
          <Section style={s.buttonSection}>
            <Button href={projectUrl} style={s.button}>
              View project
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
