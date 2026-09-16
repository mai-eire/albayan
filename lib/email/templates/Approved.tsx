import { ActionButton, Base, FallbackLink, Paragraph } from "./Base";

type Props = {
  schoolName: string;
  name: string;
  childName: string;
  studentId: string;
  password: string;
  placement: string;
  loginUrl: string;
};

export function ApprovedEmail({
  schoolName,
  name,
  childName,
  studentId,
  password,
  placement,
  loginUrl,
}: Props) {
  return (
    <Base
      schoolName={schoolName}
      preview={`${childName} has a place at ${schoolName}`}
      heading={`${childName} has a place`}
    >
      <Paragraph>Hi {name},</Paragraph>
      <Paragraph>
        Good news — {childName} has been given a place in {placement}. Their student ID is{" "}
        <strong>{studentId}</strong> and their first password is <strong>{password}</strong>. They
        will be asked to choose a new password the first time they sign in.
      </Paragraph>
      <Paragraph>Keep this email somewhere safe until then.</Paragraph>
      <ActionButton href={loginUrl}>Sign in</ActionButton>
      <FallbackLink href={loginUrl} />
    </Base>
  );
}
