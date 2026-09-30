import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "./send";
import { ActionButton, Base, FallbackLink, Paragraph } from "./templates/Base";
import { brevoTransport, fileTransport, parseSender, transportFromEnv } from "./transport";

const dir = mkdtempSync(join(tmpdir(), "albayan-mail-"));
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("email", () => {
  it("renders a template and writes it to a file with the link logged", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendEmail(
      {
        to: "parent@example.com",
        subject: "Reset your password",
        body: (
          <Base schoolName="Al-Bayan" preview="Reset your password" heading="Reset your password">
            <Paragraph>Click the button below.</Paragraph>
            <ActionButton href="https://example.com/reset?token=abc">
              Choose a new password
            </ActionButton>
            <FallbackLink href="https://example.com/reset?token=abc" />
          </Base>
        ),
      },
      fileTransport(dir),
    );
    const [file] = readdirSync(dir);
    expect(file).toMatch(/reset-your-password\.html$/);
    const html = readFileSync(join(dir, file), "utf8");
    expect(html).toContain("Choose a new password");
    expect(html).toContain("https://example.com/reset?token=abc");
    expect(log.mock.calls.flat().join("\n")).toContain("https://example.com/reset?token=abc");
    log.mockRestore();
  });

  it("carries the school's logo when there is one, and nothing when there isn't", async () => {
    const render = async (logo: string | null) => {
      await sendEmail(
        {
          to: "parent@example.com",
          subject: `Logo ${logo ? "yes" : "no"}`,
          body: (
            <Base schoolName="Al-Bayan" logo={logo} preview="Hello" heading="Hello">
              <Paragraph>Hello.</Paragraph>
            </Base>
          ),
        },
        fileTransport(dir),
      );
      const file = readdirSync(dir).find((f) => f.includes(logo ? "yes" : "no"))!;
      return readFileSync(join(dir, file), "utf8");
    };
    // Absolute, because an email is read outside the app.
    expect(await render("https://school.example/api/logo?v=abc")).toContain(
      "https://school.example/api/logo?v=abc",
    );
    expect(await render(null)).not.toContain("<img");
  });

  it("defaults to the file transport and refuses a half-configured brevo", () => {
    expect(transportFromEnv({})).toBeDefined();
    expect(() => transportFromEnv({ EMAIL_TRANSPORT: "brevo" })).toThrow(/BREVO_API_KEY/);
    expect(() => transportFromEnv({ EMAIL_TRANSPORT: "brevo", BREVO_API_KEY: "k" })).toThrow(
      /EMAIL_FROM/,
    );
  });

  // EMAIL_FROM is one string the way a mail client shows it; Brevo wants the halves apart.
  it("splits the sender into a name and an address", () => {
    expect(parseSender("Al-Bayan <noreply@mai.ie>")).toEqual({
      name: "Al-Bayan",
      email: "noreply@mai.ie",
    });
    expect(parseSender("noreply@mai.ie")).toEqual({ email: "noreply@mai.ie" });
    expect(parseSender("<noreply@mai.ie>")).toEqual({ email: "noreply@mai.ie" });
  });

  it("posts the email to Brevo in the shape it asks for", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 201 }));
    await brevoTransport("secret-key", "Al-Bayan <noreply@mai.ie>").send({
      to: "parent@example.com",
      subject: "Your payment",
      html: "<p>Thanks</p>",
      text: "Thanks",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((init!.headers as Record<string, string>)["api-key"]).toBe("secret-key");
    expect(JSON.parse(init!.body as string)).toEqual({
      sender: { name: "Al-Bayan", email: "noreply@mai.ie" },
      to: [{ email: "parent@example.com" }],
      subject: "Your payment",
      htmlContent: "<p>Thanks</p>",
      textContent: "Thanks",
    });
    fetchMock.mockRestore();
  });

  // A silent failure would lose an invite or a password reset with nothing to show for it.
  it("throws with what Brevo said when it refuses", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response('{"message":"sender not verified"}', { status: 400 }));
    await expect(
      brevoTransport("k", "noreply@mai.ie").send({
        to: "parent@example.com",
        subject: "Hi",
        html: "<p>Hi</p>",
        text: "Hi",
      }),
    ).rejects.toThrow(/400.*sender not verified/s);
    fetchMock.mockRestore();
  });
});
