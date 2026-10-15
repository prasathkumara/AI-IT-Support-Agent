// Home page smoke test (Playwright e2e).
//
// A "smoke test" is a quick, shallow check that the most basic thing works —
// like turning a device on to see if it smokes. "/" has no content of its own
// any more: it sends signed-out visitors to the login screen, so we check that
// the login page loads with its branding.
//
// `test` defines a single test case; `expect` makes assertions (statements we
// claim are true). Playwright hands each test a `page` object, which is a
// controllable browser tab.
import { test, expect } from "@playwright/test";

test("home page redirects to login and shows the branding", async ({ page }) => {
  // Step 1: open the app. "/" resolves against the baseURL in
  // playwright.config.ts, so this loads http://localhost:3000/.
  await page.goto("/");

  // Step 2: with no saved session we should land on /login.
  await expect(page).toHaveURL(/\/login$/);

  // Step 3: the hero heading and sign-in card are visible.
  // getByRole("heading", ...) finds headings by their accessible role and
  // text — the recommended, accessibility-friendly way to locate elements.
  await expect(page.getByRole("heading", { name: /Smarter support/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with Microsoft" })).toBeVisible();
});
