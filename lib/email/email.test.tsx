import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "./send";
import { ActionButton, Base, FallbackLink, Paragraph } from "./templates/Base";
import { fileTransport, transportFromEnv } from "./transport";

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

  it("defaults to the file transport and refuses a half-configured resend", () => {
    expect(transportFromEnv({})).toBeDefined();
    expect(() => transportFromEnv({ EMAIL_TRANSPORT: "resend" })).toThrow(/RESEND_API_KEY/);
  });
});
