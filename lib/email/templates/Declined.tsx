import { Base, Paragraph } from "./Base";

type Props = {
  schoolName: string;
  logo?: string | null;
  name: string;
  childName: string;
  reason: string;
};

export function DeclinedEmail({ schoolName, logo, name, childName, reason }: Props) {
  return (
    <Base
      schoolName={schoolName}
      logo={logo}
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
