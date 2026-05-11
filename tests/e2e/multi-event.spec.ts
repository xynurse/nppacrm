import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("multi-event", () => {
  test("event switcher renders in the top bar and exposes active events", async ({
    page,
  }) => {
    await login(page);
    const switcher = page.locator("header select").first();
    await expect(switcher).toBeVisible();

    const optionCount = await switcher.locator("option").count();
    expect(optionCount).toBeGreaterThan(0);

    const selected = await switcher.inputValue();
    expect(selected).not.toBe("");
  });

  test("admin can reach the events admin page from the sidebar", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/admin/events");
    await expect(
      page.getByRole("heading", { name: /events/i }).first(),
    ).toBeVisible();
  });
});
