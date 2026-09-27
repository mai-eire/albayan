import { ActionButton, Base, FallbackLink, Paragraph } from "./Base";

type Props = { schoolName: string; logo?: string | null; name: string; url: string; role: string };

export function InviteEmail({ schoolName, logo, name, url, role }: Props) {
  return (
    <Base
      schoolName={schoolName}
      logo={logo}
      preview={`Set up your ${schoolName} account`}
      heading="You've been invited"
    >
      <Paragraph>Hi {name},</Paragraph>
      <Paragraph>
        You have been given {role} access to {schoolName}. Set a password to finish creating your
        account. The link works for seven days.
      </Paragraph>
      <ActionButton href={url}>Set your password</ActionButton>
      <FallbackLink href={url} />
    </Base>
  );
}
