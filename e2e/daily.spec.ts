import { expect, test, type Page } from "@playwright/test";

// Phase 2 in one run: a teacher takes the register and marks a child absent, the family
// sees it and the office corrects it; the teacher publishes homework with a file and the
// student opens both.

// Several sign-ins and a dozen pages against a cold dev server, so these journeys get the
// same room `pages.spec.ts` gives itself rather than the 30s default.
test.describe.configure({ timeout: 120_000 });

async function signIn(page: Page, identifier: string, password = "password") {
  await page.context().clearCookies();
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel("Email or student ID").fill(identifier);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

// Seed: Aisha Siddiqui (student 34, ALB-26-0034) is in Level 1 (class 1); teacher1 leads it;
// parent17 is her parent. (Ids come from the seed's fixed random sequence — reseed to check.)
test("register → family sees the absence → office corrects it", async ({ page }) => {
  await signIn(page, "teacher1@example.com");
  await page.goto("/teacher/attendance/1", { waitUntil: "networkidle" });
  const aisha = page.locator('[aria-label="Aisha\'s attendance"]');
  await aisha.getByText("Absent").click();
  await expect(aisha.getByRole("radio", { name: "Absent" })).toBeChecked();
  await page.getByRole("textbox", { name: "Note for Aisha" }).fill("No message from home");
  await page.getByRole("button", { name: "Submit register" }).click();
  await expect(page.getByText("Register submitted")).toBeVisible();

  await signIn(page, "parent17@example.com");
  // The bell counts every unread the seed left too, so check the notification itself.
  await page.goto("/family/notifications", { waitUntil: "networkidle" });
  await expect(page.getByText("Aisha was marked absent").first()).toBeVisible();
  await page.goto("/family/34/attendance", { waitUntil: "networkidle" });
  await expect(page.getByText("Absent")).toBeVisible();

  await signIn(page, "admin@example.com");
  await page.goto("/admin/attendance/1", { waitUntil: "networkidle" });
  const aishaAgain = page.locator('[aria-label="Aisha\'s attendance"]');
  await aishaAgain.getByText("Excused").click();
  await expect(aishaAgain.getByRole("radio", { name: "Excused" })).toBeChecked();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Register updated")).toBeVisible();

  await signIn(page, "parent17@example.com");
  await page.goto("/family/34/attendance", { waitUntil: "networkidle" });
  await expect(page.getByText("Excused")).toBeVisible();
});

test("homework with a file → the student opens it", async ({ page }) => {
  await signIn(page, "teacher1@example.com");
  await page.goto("/teacher/classes/1/homework", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Add homework" }).click();
  await page.getByRole("textbox", { name: /^Title/ }).fill("Surah Al-Fil, verses 1–5");
  await page.getByRole("textbox", { name: /What to do/ }).fill("Memorise and recite.");
  await page.getByRole("button", { name: "Next lesson" }).click();
  // The attachment section is folded away; the file goes up with "Publish".
  await page.getByRole("button", { name: "Attach a file or link" }).click();
  await page.locator("input[type=file]").setInputFiles("e2e/fixtures/sheet.txt");
  await page.getByRole("dialog").getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Homework published")).toBeVisible();

  await signIn(page, "ALB-26-0034");
  await page.goto("/student/homework", { waitUntil: "networkidle" });
  await expect(page.getByText("Surah Al-Fil, verses 1–5")).toBeVisible();
  await page.goto("/student/resources", { waitUntil: "networkidle" });
  const link = page.getByRole("link", { name: "sheet.txt" });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  const file = await page.request.get(href!);
  expect(file.status()).toBe(200);
  expect(await file.text()).toContain("Practice sheet");

  // A student in another class can't open it.
  await signIn(page, "ALB-26-0001");
  const blocked = await page.request.get(href!);
  expect(blocked.status()).toBe(403);
});
