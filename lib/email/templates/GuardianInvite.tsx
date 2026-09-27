import { ActionButton, Base, FallbackLink, Paragraph } from "./Base";

type Props = {
  schoolName: string;
  logo?: string | null;
  name: string;
  url: string;
  // Who added them and which children they now share; none when the office invites someone
  // to register their own children.
  invitedBy: string;
  childNames: string[];
};

export function GuardianInviteEmail({ schoolName, logo, name, url, invitedBy, childNames }: Props) {
  const kids =
    childNames.length === 1
      ? childNames[0]
      : `${childNames.slice(0, -1).join(", ")} and ${childNames[childNames.length - 1]}`;
  return (
    <Base
      schoolName={schoolName}
      logo={logo}
      preview={
        childNames.length
          ? `${invitedBy} has added you as a parent at ${schoolName}`
          : `Your ${schoolName} account`
      }
      heading={childNames.length ? "You've been added as a parent" : `Welcome to ${schoolName}`}
    >
      <Paragraph>Hi {name},</Paragraph>
      {childNames.length ? (
        <Paragraph>
          {invitedBy} has added you as a parent or guardian of {kids} at {schoolName}. Set a
          password to see their timetable, homework, attendance and fees. The link works for seven
          days.
        </Paragraph>
      ) : (
        <Paragraph>
          {invitedBy} has set up an account for you at {schoolName}. Set a password, then register
          your children from your family area. The link works for seven days.
        </Paragraph>
      )}
      <ActionButton href={url}>Set your password</ActionButton>
      <FallbackLink href={url} />
    </Base>
  );
}
