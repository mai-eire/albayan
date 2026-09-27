import { emailLogo } from "./logo";
import { sendEmail } from "./send";
import { AbsenceEmail } from "./templates/Absence";
import { ApprovedEmail } from "./templates/Approved";
import { DeclinedEmail } from "./templates/Declined";
import { GuardianInviteEmail } from "./templates/GuardianInvite";
import { InviteEmail } from "./templates/Invite";
import { NoticeEmail } from "./templates/Notice";
import { PasswordResetEmail } from "./templates/PasswordReset";
import { VerifyEmail } from "./templates/VerifyEmail";

// One function per email the app sends. Templates never get called from elsewhere.
// Each resolves the school's logo itself, so no caller has to remember to pass it.

export async function sendPasswordReset(
  to: { email: string; name: string },
  url: string,
  schoolName: string,
) {
  const logo = await emailLogo();
  return sendEmail({
    to: to.email,
    subject: "Reset your password",
    body: <PasswordResetEmail schoolName={schoolName} logo={logo} name={to.name} url={url} />,
  });
}

export async function sendInvite(
  to: { email: string; name: string },
  url: string,
  role: string,
  schoolName: string,
) {
  const logo = await emailLogo();
  return sendEmail({
    to: to.email,
    subject: `Set up your ${schoolName} account`,
    body: <InviteEmail schoolName={schoolName} logo={logo} name={to.name} url={url} role={role} />,
  });
}

export async function sendGuardianInvite(
  to: { email: string; name: string },
  url: string,
  invitedBy: string,
  children: string[],
  schoolName: string,
) {
  const logo = await emailLogo();
  return sendEmail({
    to: to.email,
    subject: children.length
      ? `${invitedBy} has added you as a parent at ${schoolName}`
      : `Your ${schoolName} account`,
    body: (
      <GuardianInviteEmail
        schoolName={schoolName}
        logo={logo}
        name={to.name}
        url={url}
        invitedBy={invitedBy}
        childNames={children}
      />
    ),
  });
}

export async function sendVerifyEmail(
  to: { email: string; name: string },
  url: string,
  schoolName: string,
) {
  const logo = await emailLogo();
  return sendEmail({
    to: to.email,
    subject: "Confirm your email address",
    body: <VerifyEmail schoolName={schoolName} logo={logo} name={to.name} url={url} />,
  });
}

export async function sendApproved(
  to: { email: string; name: string },
  details: {
    childName: string;
    studentId: string;
    password: string;
    placement: string;
    note: string | null;
    loginUrl: string;
  },
  schoolName: string,
) {
  const logo = await emailLogo();
  return sendEmail({
    to: to.email,
    subject: `${details.childName} has a place at ${schoolName}`,
    body: <ApprovedEmail schoolName={schoolName} logo={logo} name={to.name} {...details} />,
  });
}

export async function sendDeclined(
  to: { email: string; name: string },
  details: { childName: string; reason: string },
  schoolName: string,
) {
  const logo = await emailLogo();
  return sendEmail({
    to: to.email,
    subject: `About ${details.childName}'s application`,
    body: <DeclinedEmail schoolName={schoolName} logo={logo} name={to.name} {...details} />,
  });
}

export async function sendAbsence(
  to: { email: string; name: string },
  details: { childName: string; date: string; className: string },
  schoolName: string,
) {
  const logo = await emailLogo();
  return sendEmail({
    to: to.email,
    subject: `${details.childName} was marked absent`,
    body: <AbsenceEmail schoolName={schoolName} logo={logo} name={to.name} {...details} />,
  });
}

export async function sendNotice(
  to: { email: string; name: string },
  details: { title: string; body: string; url: string },
  schoolName: string,
) {
  const logo = await emailLogo();
  return sendEmail({
    to: to.email,
    subject: details.title,
    body: <NoticeEmail schoolName={schoolName} logo={logo} name={to.name} {...details} />,
  });
}
