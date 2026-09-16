import { ActionButton, Base, FallbackLink, Paragraph } from "./Base";

type Props = { schoolName: string; name: string; url: string };

export function PasswordResetEmail({ schoolName, name, url }: Props) {
  return (
    <Base schoolName={schoolName} preview="Choose a new password" heading="Reset your password">
      <Paragraph>Hi {name},</Paragraph>
      <Paragraph>
        Someone asked to reset the password for your {schoolName} account. If that was you, choose a
        new password below. The link works for one hour.
      </Paragraph>
      <ActionButton href={url}>Choose a new password</ActionButton>
      <FallbackLink href={url} />
    </Base>
  );
}
