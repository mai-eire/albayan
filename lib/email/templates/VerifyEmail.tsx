import { ActionButton, Base, FallbackLink, Paragraph } from "./Base";

type Props = { schoolName: string; name: string; url: string };

export function VerifyEmail({ schoolName, name, url }: Props) {
  return (
    <Base schoolName={schoolName} preview="Confirm your email address" heading="Confirm your email">
      <Paragraph>Hi {name},</Paragraph>
      <Paragraph>
        Thanks for creating a {schoolName} account. Confirm this is your email address and you can
        register your children.
      </Paragraph>
      <ActionButton href={url}>Confirm my email</ActionButton>
      <FallbackLink href={url} />
    </Base>
  );
}
