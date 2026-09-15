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

  it("defaults to the file transport and refuses a half-configured resend", () => {
    expect(transportFromEnv({})).toBeDefined();
    expect(() => transportFromEnv({ EMAIL_TRANSPORT: "resend" })).toThrow(/RESEND_API_KEY/);
  });
});
