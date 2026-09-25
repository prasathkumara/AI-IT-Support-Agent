// Home page smoke test (Playwright e2e).
//
// A "smoke test" is a quick, shallow check that the most basic thing works —
// like turning a device on to see if it smokes. Here we just confirm the home
// page loads and shows the platform name. If this fails, something is badly
// broken and there is no point running deeper tests.
//
// `test` defines a single test case; `expect` makes assertions (statements we
// claim are true). Playwright hands each test a `page` object, which is a
// controllable browser tab.
import { test, expect } from "@playwright/test";

test("home page shows the platform name", async ({ page }) => {
  // Step 1: open the app. "/" resolves against the baseURL in
  // playwright.config.ts, so this loads http://localhost:3000/.
  await page.goto("/");

  // Step 2: assert the expected result is visible on screen.
  // getByRole("heading", ...) finds our <h1> by its accessible role and text —
  // this is the recommended, accessibility-friendly way to locate elements.
  await expect(
    page.getByRole("heading", { name: "AI IT Support Platform" }),
  ).toBeVisible();

  // A second, looser check: the text appears somewhere on the page at all.
  await expect(page.getByText("AI IT Support Platform")).toBeVisible();
});
