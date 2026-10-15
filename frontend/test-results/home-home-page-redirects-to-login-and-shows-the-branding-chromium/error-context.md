# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: home.spec.ts >> home page redirects to login and shows the branding
- Location: tests\e2e\home.spec.ts:13:5

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/login$/
Received string:  "http://localhost:3000/"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × locator resolved to <html lang="en">…</html>
       - unexpected value "http://localhost:3000/"

```

```yaml
- main:
  - heading "AI IT Support Platform" [level=1]
  - status: Loading AI IT Support
```

# Test source

```ts
  1  | // Home page smoke test (Playwright e2e).
  2  | //
  3  | // A "smoke test" is a quick, shallow check that the most basic thing works —
  4  | // like turning a device on to see if it smokes. "/" has no content of its own
  5  | // any more: it sends signed-out visitors to the login screen, so we check that
  6  | // the login page loads with its branding.
  7  | //
  8  | // `test` defines a single test case; `expect` makes assertions (statements we
  9  | // claim are true). Playwright hands each test a `page` object, which is a
  10 | // controllable browser tab.
  11 | import { test, expect } from "@playwright/test";
  12 | 
  13 | test("home page redirects to login and shows the branding", async ({ page }) => {
  14 |   // Step 1: open the app. "/" resolves against the baseURL in
  15 |   // playwright.config.ts, so this loads http://localhost:3000/.
  16 |   await page.goto("/");
  17 | 
  18 |   // Step 2: with no saved session we should land on /login.
> 19 |   await expect(page).toHaveURL(/\/login$/);
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  20 | 
  21 |   // Step 3: the hero heading and sign-in card are visible.
  22 |   // getByRole("heading", ...) finds headings by their accessible role and
  23 |   // text — the recommended, accessibility-friendly way to locate elements.
  24 |   await expect(page.getByRole("heading", { name: /Smarter support/ })).toBeVisible();
  25 |   await expect(page.getByRole("button", { name: "Sign in with Microsoft" })).toBeVisible();
  26 | });
  27 | 
```