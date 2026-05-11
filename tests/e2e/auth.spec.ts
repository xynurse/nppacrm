import { expect, test } from "@playwright/test";
import { adminCredentials, login } from "./helpers";

test.describe("auth", () => {
  test("unauthenticated visit redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login(\?|$)/);
    await expect(
      page.getByRole("heading", { name: /sponsorship crm/i }),
    ).toBeVisible();
  });

  test("bad password shows an error and stays on /login", async ({ page }) => {
    const { email } = adminCredentials();
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|incorrect|wrong/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test("seeded admin can sign in and land on the dashboard", async ({
    page,
  }) => {
    await login(page);
    await expect(
      page.getByRole("heading", { name: /dashboard/i }),
    ).toBeVisible();
  });
});
