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

// EMAIL_FROM is written the way a mail client shows it, "Al-Bayan <noreply@mai.ie>".
// Brevo wants the two halves apart.
export function parseSender(from: string): { name?: string; email: string } {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match ? { name: match[1] || undefined, email: match[2] } : { email: from.trim() };
}

// Production. Brevo's transactional API is one POST; no SDK needed.
export function brevoTransport(apiKey: string, from: string): Transport {
  const sender = parseSender(from);
  return {
    async send(email) {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender,
          to: [{ email: email.to }],
          subject: email.subject,
          htmlContent: email.html,
          textContent: email.text,
        }),
      });
      if (!response.ok) {
        throw new Error(`Brevo rejected the email (${response.status}): ${await response.text()}`);
      }
    },
  };
}

// EMAIL_TRANSPORT=brevo needs BREVO_API_KEY and EMAIL_FROM; anything else writes files
// (to EMAIL_DIR, default .dev/mail).
type EmailEnv = Record<string, string | undefined>;

export function transportFromEnv(env: EmailEnv = process.env): Transport {
  if (env.EMAIL_TRANSPORT === "brevo") {
    if (!env.BREVO_API_KEY || !env.EMAIL_FROM) {
      throw new Error("EMAIL_TRANSPORT=brevo requires BREVO_API_KEY and EMAIL_FROM");
    }
    return brevoTransport(env.BREVO_API_KEY, env.EMAIL_FROM);
  }
  return fileTransport(env.EMAIL_DIR);
}
