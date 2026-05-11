import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("companies", () => {
  test("admin can load /companies and see the table shell", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/companies");
    await expect(
      page.getByRole("heading", { name: /companies/i }),
    ).toBeVisible();
    await expect(page.locator("table").first()).toBeVisible();
  });

  test("command palette opens with ⌘K and closes with Escape", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/companies");
    await page.keyboard.press("ControlOrMeta+KeyK");
    const palette = page.getByRole("dialog");
    await expect(palette).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden();
  });
});
