import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, identifier: string, password = "password") {
  await page.goto("/login");
  await page.getByLabel("Email or student ID").fill(identifier);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(admin|teacher|family|student)/);
}

test("admin signs in and sees the dashboard shell", async ({ page }) => {
  await signIn(page, "admin@example.com");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Applications pending")).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
});

test("a teacher-parent can switch areas and is kept out of admin", async ({ page }) => {
  await signIn(page, "teacher1@example.com");
  await expect(page).toHaveURL(/\/teacher$/);
  await page.getByRole("button", { name: "Teacher" }).click();
  await page.getByRole("menuitem", { name: "Family" }).click();
  await expect(page).toHaveURL(/\/family$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/teacher$/);
});

test("a student signs in with their student ID", async ({ page }) => {
  await signIn(page, "ALB-26-0001");
  await expect(page).toHaveURL(/\/student$/);
  await expect(page.getByRole("heading", { name: /^Hi, / })).toBeVisible();
});

test("wrong password shows an inline error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email or student ID").fill("admin@example.com");
  await page.getByLabel("Password", { exact: true }).fill("nope");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("We couldn't sign you in")).toBeVisible();
});
