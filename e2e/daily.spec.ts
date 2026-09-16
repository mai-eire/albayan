import { expect, test, type Page } from "@playwright/test";

// Phase 2 in one run: a teacher takes the register and marks a child absent, the family
// sees it and the office corrects it; the teacher publishes homework with a file and the
// student opens both.

async function signIn(page: Page, identifier: string, password = "password") {
  await page.context().clearCookies();
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel("Email or student ID").fill(identifier);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

// Seed: Adam Hussain (student 30, ALB-26-0030) is in Level 1 (class 1); teacher1 leads it;
// parent15 is his mother.
test("register → family sees the absence → office corrects it", async ({ page }) => {
  await signIn(page, "teacher1@example.com");
  await page.goto("/teach/attendance/1", { waitUntil: "networkidle" });
  const adam = page.getByRole("button", { name: /^Adam:/ });
  await adam.click(); // late
  await adam.click(); // absent
  await expect(adam).toHaveAttribute("aria-label", /absent/);
  await page.getByRole("textbox", { name: "Note for Adam" }).fill("No message from home");
  await page.getByRole("button", { name: "Submit register" }).click();
  await expect(page.getByText("Register submitted")).toBeVisible();

  await signIn(page, "parent15@example.com");
  await expect(page.getByRole("link", { name: /1 unread notification/ })).toBeVisible();
  await page.goto("/family/30/attendance", { waitUntil: "networkidle" });
  await expect(page.getByText("Absent")).toBeVisible();

  await signIn(page, "admin@example.com");
  await page.goto("/admin/attendance/1", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Adam:/ }).click(); // absent → excused
  await expect(page.getByRole("button", { name: /^Adam:/ })).toHaveAttribute(
    "aria-label",
    /excused/,
  );
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Register updated")).toBeVisible();

  await signIn(page, "parent15@example.com");
  await page.goto("/family/30/attendance", { waitUntil: "networkidle" });
  await expect(page.getByText("Excused")).toBeVisible();
});

test("homework with a file → the student opens it", async ({ page }) => {
  await signIn(page, "teacher1@example.com");
  await page.goto("/teach/classes/1/homework", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Add homework" }).click();
  await page.getByRole("textbox", { name: /^Title/ }).fill("Surah Al-Fil, verses 1–5");
  await page.getByRole("textbox", { name: /What to do/ }).fill("Memorise and recite.");
  await page.getByRole("textbox", { name: /^Due/ }).fill("19 Sep 2026");
  await page.getByRole("textbox", { name: /^Due/ }).press("Tab");
  await page.getByRole("dialog").getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Homework published")).toBeVisible();
  await page.getByRole("button", { name: /Actions for Surah Al-Fil/ }).click();
  await page.getByRole("menuitem", { name: "Attach a file or link" }).click();
  await page.locator("input[type=file]").setInputFiles("e2e/fixtures/sheet.txt");
  await page.getByRole("dialog").getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByText("Shared", { exact: true })).toBeVisible();

  await signIn(page, "ALB-26-0030");
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
