import { expect, test, type Page } from "@playwright/test";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Every page opens cleanly for the role that owns it: no console errors, no uncaught
// exceptions, no error response. A page that crashes only at runtime (a Server Component
// handing a function to Mantine, a query that throws on real data) fails here, not in front
// of the school. Adding a page.tsx without listing it below fails the suite too.

// Seed ids (lib/db/seed.ts): user 1 admin, user 2 teacher 1 (also guardian 1, mother of
// students 1 and 2); class 1 = Level 1 Saturday, session 1, year 2026-27.
const params: Record<string, string> = {
  "[id]": "1",
  "[classId]": "1",
  "[token]": "not-a-real-token",
};
const year = "2026-27";

const routes: Record<string, string[]> = {
  admin: [
    "/admin",
    "/admin/academics",
    "/admin/academics/classes",
    "/admin/academics/classes/[id]",
    "/admin/academics/classes/[id]/applications",
    "/admin/academics/classes/[id]/attendance",
    "/admin/academics/classes/[id]/students",
    "/admin/academics/classes/[id]/teachers",
    "/admin/academics/sessions",
    "/admin/academics/sessions/[id]",
    "/admin/academics/subjects",
    "/admin/academics/years",
    `/admin/academics/years/${year}`,
    "/admin/applications",
    "/admin/attendance",
    "/admin/attendance?date=2026-09",
    "/admin/attendance/[classId]?date=2026-09-12",
    "/admin/fees",
    "/admin/fees?show=everyone",
    "/admin/guardians",
    "/admin/guardians/[id]",
    "/admin/guardians/[id]/payments",
    "/admin/guardians/[id]/sensitive",
    "/admin/notifications",
    "/admin/resources",
    "/admin/settings",
    "/admin/staff",
    "/admin/staff?show=all",
    "/admin/staff/[id]",
    "/admin/staff/[id]/classes",
    "/admin/staff/[id]/notes",
    "/admin/students",
    "/admin/students/[id]",
    "/admin/students/[id]/class",
    "/admin/students/[id]/family",
    "/admin/students/[id]/application",
    "/admin/students/[id]/fees",
    "/admin/students/[id]/notes",
    "/admin/students/[id]/sensitive",
    "/admin/rules",
    "/dev/ui",
  ],
  teacher: [
    "/teacher",
    "/teacher/attendance",
    "/teacher/attendance/[classId]?date=2026-09-12",
    "/teacher/classes",
    "/teacher/classes/[id]",
    "/teacher/classes/[id]/attendance",
    "/teacher/classes/[id]/homework",
    "/teacher/classes/[id]/resources",
    "/teacher/homework",
    "/teacher/notifications",
    "/teacher/resources",
    "/teacher/students/[id]",
    "/teacher/students/[id]/application",
    "/teacher/students/[id]/attendance",
    "/teacher/students/[id]/notes",
    "/teacher/students/[id]/resources",
    "/teacher/rules",
    "/teacher/timetable",
  ],
  family: [
    "/family",
    "/family/[id]",
    "/family/[id]/application",
    "/family/[id]/attendance",
    "/family/[id]/fees",
    "/family/[id]/homework",
    "/family/[id]/notes",
    "/family/[id]/resources",
    "/family/[id]/timetable",
    "/family/account",
    "/family/calendar",
    "/family/fees",
    "/family/notifications",
    "/family/parents",
    "/family/register-child",
    "/family/rules",
  ],
  student: [
    "/student",
    "/student/attendance",
    "/student/details",
    "/student/calendar",
    "/student/homework",
    "/student/notifications",
    "/student/resources",
    "/student/rules",
    "/student/timetable",
  ],
  anonymous: [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/change-password",
    "/invite/[token]",
  ],
};

// teacher1 is a teacher and a guardian (of students 1 and 2), so one account covers both.
const accounts: Record<string, string | null> = {
  admin: "admin@example.com",
  teacher: "teacher1@example.com",
  family: "teacher1@example.com",
  student: "ALB-26-0001",
  anonymous: null,
};

function fill(route: string) {
  return route.replace(/\[[^\]]+\]/g, (m) => params[m] ?? m);
}

function pagesUnder(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...pagesUnder(path, `${prefix}/${entry}`));
    else if (entry === "page.tsx") out.push(prefix || "/");
  }
  return out;
}

test("every page.tsx is in the sweep", () => {
  const listed = new Set(
    Object.values(routes)
      .flat()
      .map((r) => r.split("?")[0].replace(`/${year}`, "/[id]")),
  );
  const missing = pagesUnder("app")
    .map((p) => p.replace(/\/\([^)]+\)/g, ""))
    .filter((p) => !listed.has(p));
  expect(missing, "add these to e2e/pages.spec.ts").toEqual([]);
});

async function signIn(page: Page, identifier: string) {
  await page.goto("/login");
  await page.getByLabel("Email or student ID").fill(identifier);
  await page.getByLabel("Password", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(admin|teach|family|student)/);
}

for (const [area, list] of Object.entries(routes)) {
  // One signed-in page per area, one test per route so a failure names the page.
  test.describe(`${area} pages`, () => {
    // Serial and patient: the dev server compiles each route on first visit.
    test.describe.configure({ mode: "serial", timeout: 90_000 });
    let page: Page;
    const problems: string[] = [];

    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage();
      page.on("console", (m) => {
        if (m.type() === "error") problems.push(`console — ${m.text().slice(0, 200)}`);
      });
      page.on("pageerror", (e) => problems.push(`threw — ${e.message.slice(0, 200)}`));
      const account = accounts[area];
      if (account) await signIn(page, account);
    });
    test.afterAll(() => page.close());

    for (const route of list) {
      test(fill(route), async () => {
        problems.length = 0;
        const response = await page.goto(fill(route));
        expect(response?.status(), `responded ${response?.status()}`).toBeLessThan(500);
        await page.waitForLoadState("networkidle");
        expect(problems).toEqual([]);
      });
    }
  });
}
