import { expect, test } from "@playwright/test";
import { latestEmail } from "./mail";

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

  const link = latestEmail("confirm-your-email", "Nadia").match(
    /href="(http[^"]*verify-email[^"]*)"/,
  )?.[1];
  expect(link).toBeTruthy();
  await page.goto(link!);

  await expect(page).toHaveURL(/\/family$/);
  await expect(page.getByText("Confirm your email to register your children")).toHaveCount(0);
  await expect(
    page.getByRole("main").getByRole("link", { name: "Register a child" }),
  ).toBeVisible();
});

test("registering with an email that already has an account is refused", async ({ page }) => {
  // A direct load: wait for hydration or the typed values are thrown away.
  await page.goto("/register", { waitUntil: "networkidle" });
  await page.getByLabel("Your name").fill("Someone");
  await page.getByLabel("Email").fill("parent3@example.com");
  await page.getByLabel("Phone").fill("0861234567");
  await page.getByRole("textbox", { name: /^Password/ }).fill("a fine password");
  await page.getByRole("textbox", { name: /^Confirm password/ }).fill("a fine password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("There's already an account with that email")).toBeVisible();
});
