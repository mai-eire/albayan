import { ActionButton, Base, FallbackLink, Paragraph } from "./Base";

type Props = {
  schoolName: string;
  logo?: string | null;
  name: string;
  title: string;
  body: string;
  url: string;
};

// The email twin of an in-app notification: one heading, one paragraph, one link.
export function NoticeEmail({ schoolName, logo, name, title, body, url }: Props) {
  return (
    <Base schoolName={schoolName} logo={logo} preview={title} heading={title}>
      <Paragraph>Hi {name},</Paragraph>
      <Paragraph>{body}</Paragraph>
      <ActionButton href={url}>Open in {schoolName}</ActionButton>
      <FallbackLink href={url} />
    </Base>
  );
}
