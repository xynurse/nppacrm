import type { Page } from "@playwright/test";

export function adminCredentials() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in the env so " +
        "Playwright can sign in. Seed the DB first: pnpm db:seed.",
    );
  }
  return { email, password };
}

export async function login(page: Page) {
  const { email, password } = adminCredentials();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("/");
}
