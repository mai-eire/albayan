import { sendEmail } from "./send";
import { InviteEmail } from "./templates/Invite";
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
