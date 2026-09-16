import { expect, test, type Page } from "@playwright/test";
import { latestEmail } from "./mail";

// The whole Phase 1 story in one run: a parent registers, confirms their email and applies
// for a child; the office approves; the child signs in with the emailed ID and password and
// sees their timetable; a teacher who doesn't teach that class is kept out.

async function signIn(page: Page, identifier: string, password = "password") {
  await page.context().clearCookies();
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel("Email or student ID").fill(identifier);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function pick(page: Page, name: RegExp | string, option: string) {
  await page.getByRole("combobox", { name }).click();
  await page.locator("[role=option]:visible", { hasText: option }).first().click();
}

test("register → apply → approve → student signs in; teacher kept out", async ({ page }) => {
  test.setTimeout(90_000);

  // Parent registers and confirms their email.
  await page.goto("/register", { waitUntil: "networkidle" });
  await page.getByLabel("Your name").fill("Samira Farah");
  await page.getByLabel("Email").fill("samira@example.com");
  await page.getByLabel("Phone").fill("0861234567");
  await page.getByRole("textbox", { name: /^Password/ }).fill("a fine password");
  await page.getByRole("textbox", { name: /^Confirm password/ }).fill("a fine password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/family$/);
  const verifyLink = latestEmail("confirm-your-email", "Samira").match(
    /href="(http[^"]*verify-email[^"]*)"/,
  )?.[1];
  await page.goto(verifyLink!);
  await expect(page).toHaveURL(/\/family$/);

  // Applies for Hamza, asking for Sunday.
  await page.getByRole("main").getByRole("link", { name: "Register a child" }).click();
  await expect(page).toHaveURL(/register-child/);
  await pick(page, /Your relationship/, "Mother");
  await page.getByRole("textbox", { name: /^Address(?! line)/ }).fill("1 Main Street");
  await page.getByRole("textbox", { name: /^Town or city/ }).fill("Dublin");
  await page.getByRole("textbox", { name: /^Eircode/ }).fill("D15 AB12");
  await page.getByRole("textbox", { name: /^Name/ }).fill("Huda Farah");
  await page.getByRole("textbox", { name: /^Phone/ }).fill("0871112222");
  await page.getByRole("textbox", { name: /^Relationship to the child/ }).fill("Aunt");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("textbox", { name: /^First name/ }).fill("Hamza");
  await page.getByRole("textbox", { name: /^Surname/ }).fill("Farah");
  await page.getByRole("textbox", { name: /^Date of birth/ }).fill("4 May 2018");
  await page.getByRole("textbox", { name: /^Date of birth/ }).press("Tab");
  await pick(page, /^Gender/, "Boy");
  await pick(page, /^Preferred day/, "Sunday");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Optional. Used only for anonymous")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Hamza Farah")).toBeVisible();
  await page.getByRole("button", { name: "Send application" }).click();
  await expect(page.getByText("Application received for Hamza")).toBeVisible();

  // The office approves, placing Hamza in a Sunday class.
  await signIn(page, "admin@example.com");
  await page.goto("/admin/applications", { waitUntil: "networkidle" });
  await page.locator("tbody tr", { hasText: "Hamza Farah" }).click();
  await page.getByRole("button", { name: "Offer a place" }).click();
  await expect(page.getByRole("combobox", { name: "Day" })).toHaveValue("Sunday");
  await page.getByRole("button", { name: "Offer the place" }).click();
  await expect(page.getByText(/Hamza is now ALB-26-\d{4}/)).toBeVisible();

  // The parent sees the place and the notification.
  await signIn(page, "samira@example.com", "a fine password");
  await expect(page).toHaveURL(/\/family$/);
  await expect(page.getByRole("link", { name: "1 unread notifications" })).toBeVisible();
  const childHref = await page
    .locator("main a[href^='/family/']:not([href*=register])")
    .first()
    .getAttribute("href");
  await page.goto(childHref!);
  await expect(page.getByText(/Next class/)).toBeVisible();

  // Hamza signs in with the emailed ID and password, changes it, and sees the timetable.
  const approved = latestEmail("has-a-place", "Samira");
  const studentId = approved.match(/ALB-26-\d{4}/)?.[0];
  const firstPassword = approved.match(/first password is <strong>([a-z0-9]+)<\/strong>/)?.[1];
  expect(studentId && firstPassword).toBeTruthy();
  await signIn(page, studentId!, firstPassword!);
  await expect(page).toHaveURL(/change-password/);
  await page.getByLabel("Current password").fill(firstPassword!);
  await page.getByLabel("New password", { exact: true }).fill("hamza-new-password");
  await page.getByLabel("Confirm new password").fill("hamza-new-password");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/\/student$/);
  await page.getByRole("link", { name: "Timetable" }).first().click();
  await expect(page.getByText("Every Sunday")).toBeVisible();
  await expect(page.getByText("Quran")).toBeVisible();

  // A Saturday teacher cannot open Hamza's page.
  await signIn(page, "teacher2@example.com");
  await expect(page).toHaveURL(/\/teach$/);
  const blocked = await page.goto(`/teach/students/${childHref!.split("/").pop()}`);
  expect(blocked?.status()).toBe(404);
});
