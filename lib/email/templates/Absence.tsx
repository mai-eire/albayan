import { Base, Paragraph } from "./Base";

type Props = {
  schoolName: string;
  name: string;
  childName: string;
  date: string;
  className: string;
};

export function AbsenceEmail({ schoolName, name, childName, date, className }: Props) {
  return (
    <Base
      schoolName={schoolName}
      preview={`${childName} was marked absent`}
      heading={`${childName} was marked absent`}
    >
      <Paragraph>Hi {name},</Paragraph>
      <Paragraph>
        {childName} was marked absent from {className} on {date}. If this is a mistake, or you would
        like to tell us why, contact the school office.
      </Paragraph>
    </Base>
  );
}
