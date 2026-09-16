import { Base, Paragraph } from "./Base";

type Props = { schoolName: string; name: string; childName: string; reason: string };

export function DeclinedEmail({ schoolName, name, childName, reason }: Props) {
  return (
    <Base
      schoolName={schoolName}
      preview={`About ${childName}'s application`}
      heading={`About ${childName}'s application`}
    >
      <Paragraph>Hi {name},</Paragraph>
      <Paragraph>
        We&apos;re sorry — we can&apos;t offer {childName} a place at {schoolName} right now.
      </Paragraph>
      <Paragraph>{reason}</Paragraph>
      <Paragraph>
        If you have any questions, reply to this email or contact the school office.
      </Paragraph>
    </Base>
  );
}
