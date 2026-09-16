import { readdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// The e2e server writes emails to .dev/e2e-mail (playwright.config.ts).
function latestEmail(subjectSlug: string) {
  const dir = ".dev/e2e-mail";
  const file = readdirSync(dir)
    .filter((f) => f.includes(subjectSlug))
    .sort()
    .at(-1);
  if (!file) throw new Error(`No email matching ${subjectSlug} in ${dir}`);
  return readFileSync(`${dir}/${file}`, "utf8").replace(/&amp;/g, "&");
}

test("a guardian registers, confirms their email and can register a child", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "New here? Create an account" }).click();
  await page.getByLabel("Your name").fill("Nadia Farah");
  await page.getByLabel("Email").fill("nadia@example.com");
  await page.getByLabel("Phone").fill("0861234567");
  await page.getByRole("textbox", { name: /^Password/ }).fill("a fine password");
  await page.getByRole("textbox", { name: /^Confirm password/ }).fill("a fine password");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/family$/);
  await expect(page.getByText("Confirm your email to register your children")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Register a child" })).toHaveCount(
    0,
  );

  const link = latestEmail("confirm-your-email").match(/href="(http[^"]*verify-email[^"]*)"/)?.[1];
  expect(link).toBeTruthy();
  await page.goto(link!);

  await expect(page).toHaveURL(/\/family$/);
  await expect(page.getByText("Confirm your email to register your children")).toHaveCount(0);
  await expect(
    page.getByRole("main").getByRole("link", { name: "Register a child" }),
  ).toBeVisible();
});

test("registering with an email that already has an account is refused", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Your name").fill("Someone");
  await page.getByLabel("Email").fill("parent3@example.com");
  await page.getByLabel("Phone").fill("0861234567");
  await page.getByRole("textbox", { name: /^Password/ }).fill("a fine password");
  await page.getByRole("textbox", { name: /^Confirm password/ }).fill("a fine password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("There's already an account with that email")).toBeVisible();
});
