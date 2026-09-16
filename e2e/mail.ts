import { readdirSync, readFileSync } from "node:fs";

// The e2e server writes emails to .dev/e2e-mail (playwright.config.ts). Specs run in
// parallel, so match on the recipient's name as well as the subject.
export function latestEmail(subjectSlug: string, recipientName: string) {
  const dir = ".dev/e2e-mail";
  const match = readdirSync(dir)
    .filter((f) => f.includes(subjectSlug))
    .sort()
    .reverse()
    .map((f) => readFileSync(`${dir}/${f}`, "utf8").replace(/&amp;/g, "&"))
    .find((html) => html.includes(recipientName));
  if (!match) throw new Error(`No "${subjectSlug}" email for ${recipientName} in ${dir}`);
  return match;
}
