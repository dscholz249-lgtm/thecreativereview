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
  reviewerName: string;
  reviewerEmail: string;
  assetName: string;
  projectName: string;
  verdict: "approve" | "reject";
  feedbackText: string | null;
  annotationCount: number;
  detailUrl: string;
};

export default function DecisionSubmittedEmail({
  reviewerName,
  reviewerEmail,
  assetName,
  projectName,
  verdict,
  feedbackText,
  annotationCount,
  detailUrl,
}: Props) {
  const who = reviewerName?.trim() || reviewerEmail;
  const verdictLabel =
    verdict === "approve" ? "approved" : "requested changes on";
  const subject = `${who} ${verdictLabel} ${assetName}`;
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Heading style={s.heading}>
            {who} {verdictLabel} {assetName}
          </Heading>
          <Text style={s.paragraph}>
            Project <strong>{projectName}</strong>.
            {verdict === "reject" && annotationCount > 0
              ? ` ${annotationCount} pin${annotationCount === 1 ? "" : "s"} of feedback.`
              : ""}
          </Text>
          {verdict === "reject" && feedbackText ? (
            <Text
              style={{
                ...s.paragraph,
                backgroundColor: "#f7f7f5",
                borderLeft: "3px solid #A32D2D",
                padding: "10px 14px",
                fontStyle: "italic",
              }}
            >
              {feedbackText}
            </Text>
          ) : null}
          <Section style={s.buttonSection}>
            <Button href={detailUrl} style={s.button}>
              Open asset
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
