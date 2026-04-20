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
  projectName: string;
  assetName: string;
  assetType: string;
  deadline: string | null;
  reviewUrl: string;
  uploadNote: string | null;
};

export default function NewAssetUploadedEmail({
  workspaceName,
  projectName,
  assetName,
  assetType,
  deadline,
  reviewUrl,
  uploadNote,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>{`New from ${workspaceName}: ${assetName} is ready for your review`}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Heading style={s.heading}>A new asset is ready for review</Heading>
          <Text style={s.paragraph}>
            {workspaceName} just uploaded <strong>{assetName}</strong> (
            {assetType}) in <strong>{projectName}</strong>.
            {deadline ? ` Due ${deadline}.` : ""}
          </Text>
          {uploadNote ? (
            <Text
              style={{
                ...s.paragraph,
                backgroundColor: "#f7f7f5",
                borderLeft: "3px solid #185fa5",
                padding: "10px 14px",
                fontStyle: "italic",
              }}
            >
              {uploadNote}
            </Text>
          ) : null}
          <Section style={s.buttonSection}>
            <Button href={reviewUrl} style={s.button}>
              Review now
            </Button>
          </Section>
          <Text style={s.footer}>
            You&apos;re receiving this because you&apos;re a reviewer on{" "}
            {projectName}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
