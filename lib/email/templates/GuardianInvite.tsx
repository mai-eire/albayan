import { ActionButton, Base, FallbackLink, Paragraph } from "./Base";

type Props = {
  schoolName: string;
  name: string;
  url: string;
  // Who added them and which children they now share.
  invitedBy: string;
  childNames: string[];
};

export function GuardianInviteEmail({ schoolName, name, url, invitedBy, childNames }: Props) {
  const kids =
    childNames.length === 1
      ? childNames[0]
      : `${childNames.slice(0, -1).join(", ")} and ${childNames[childNames.length - 1]}`;
  return (
    <Base
      schoolName={schoolName}
      preview={`${invitedBy} has added you as a parent at ${schoolName}`}
      heading="You've been added as a parent"
    >
      <Paragraph>Hi {name},</Paragraph>
      <Paragraph>
        {invitedBy} has added you as a parent or guardian of {kids} at {schoolName}. Set a password
        to see their timetable, homework, attendance and fees. The link works for seven days.
      </Paragraph>
      <ActionButton href={url}>Set your password</ActionButton>
      <FallbackLink href={url} />
    </Base>
  );
}
