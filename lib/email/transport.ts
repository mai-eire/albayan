export type Email = { to: string; subject: string; html: string; text: string };

export type Transport = { send(email: Email): Promise<void> };

// Dev and tests: each email becomes a file under .dev/mail; any link in it is logged so
// password-reset and invite flows can be followed from the terminal.
export function fileTransport(dir = ".dev/mail"): Transport {
  return {
    async send(email) {
      const fs = await import("node:fs/promises");
      await fs.mkdir(dir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const slug = email.subject
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const path = `${dir}/${stamp}-${slug}.html`;
      await fs.writeFile(path, email.html);
      const link = email.text.match(/https?:\/\/\S+/)?.[0];
      console.log(
        `[mail] to ${email.to}: "${email.subject}" → ${path}${link ? `\n[mail] link: ${link}` : ""}`,
      );
    },
  };
}

// Production. Resend's API is one POST; no SDK needed.
export function resendTransport(apiKey: string, from: string): Transport {
  return {
    async send(email) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
        }),
      });
      if (!response.ok) {
        throw new Error(`Resend rejected the email (${response.status}): ${await response.text()}`);
      }
    },
  };
}

// EMAIL_TRANSPORT=resend needs RESEND_API_KEY and EMAIL_FROM; anything else writes files
// (to EMAIL_DIR, default .dev/mail).
type EmailEnv = Record<string, string | undefined>;

export function transportFromEnv(env: EmailEnv = process.env): Transport {
  if (env.EMAIL_TRANSPORT === "resend") {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
      throw new Error("EMAIL_TRANSPORT=resend requires RESEND_API_KEY and EMAIL_FROM");
    }
    return resendTransport(env.RESEND_API_KEY, env.EMAIL_FROM);
  }
  return fileTransport(env.EMAIL_DIR);
}
