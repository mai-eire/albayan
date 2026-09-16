import { sendEmail } from "./send";
import { AbsenceEmail } from "./templates/Absence";
import { ApprovedEmail } from "./templates/Approved";
import { DeclinedEmail } from "./templates/Declined";
import { InviteEmail } from "./templates/Invite";
import { NoticeEmail } from "./templates/Notice";
import { PasswordResetEmail } from "./templates/PasswordReset";
import { VerifyEmail } from "./templates/VerifyEmail";

// One function per email the app sends. Templates never get called from elsewhere.

export function sendPasswordReset(
  to: { email: string; name: string },
  url: string,
  schoolName: string,
) {
  return sendEmail({
    to: to.email,
    subject: "Reset your password",
    body: <PasswordResetEmail schoolName={schoolName} name={to.name} url={url} />,
  });
}

export function sendInvite(
  to: { email: string; name: string },
  url: string,
  role: string,
  schoolName: string,
) {
  return sendEmail({
    to: to.email,
    subject: `Set up your ${schoolName} account`,
    body: <InviteEmail schoolName={schoolName} name={to.name} url={url} role={role} />,
  });
}

export function sendVerifyEmail(
  to: { email: string; name: string },
  url: string,
  schoolName: string,
) {
  return sendEmail({
    to: to.email,
    subject: "Confirm your email address",
    body: <VerifyEmail schoolName={schoolName} name={to.name} url={url} />,
  });
}

export function sendApproved(
  to: { email: string; name: string },
  details: {
    childName: string;
    studentId: string;
    password: string;
    placement: string;
    loginUrl: string;
  },
  schoolName: string,
) {
  return sendEmail({
    to: to.email,
    subject: `${details.childName} has a place at ${schoolName}`,
    body: <ApprovedEmail schoolName={schoolName} name={to.name} {...details} />,
  });
}

export function sendDeclined(
  to: { email: string; name: string },
  details: { childName: string; reason: string },
  schoolName: string,
) {
  return sendEmail({
    to: to.email,
    subject: `About ${details.childName}'s application`,
    body: <DeclinedEmail schoolName={schoolName} name={to.name} {...details} />,
  });
}

export function sendAbsence(
  to: { email: string; name: string },
  details: { childName: string; date: string; className: string },
  schoolName: string,
) {
  return sendEmail({
    to: to.email,
    subject: `${details.childName} was marked absent`,
    body: <AbsenceEmail schoolName={schoolName} name={to.name} {...details} />,
  });
}

export function sendNotice(
  to: { email: string; name: string },
  details: { title: string; body: string; url: string },
  schoolName: string,
) {
  return sendEmail({
    to: to.email,
    subject: details.title,
    body: <NoticeEmail schoolName={schoolName} name={to.name} {...details} />,
  });
}
