// Playwright configuration for the frontend end-to-end (e2e) tests.
//
// New concept: end-to-end (e2e) testing.
// An e2e test drives a REAL browser the same way a person would — it opens a
// page, looks at what renders, and clicks/types if needed. It checks the whole
// flow from the outside (open the page -> see the expected result), rather than
// testing one function in isolation. Playwright is the tool that automates that
// browser for us.
//
// defineConfig just gives us type-checking + editor autocomplete for the config
// object. devices holds ready-made browser presets (screen size, user agent,
// etc.) so we do not have to configure a browser by hand.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // Where Playwright looks for test files. All our e2e specs live here.
  testDir: "./tests/e2e",

  // baseURL lets tests navigate with page.goto("/") instead of the full URL.
  // "/" then resolves against this address (the Next.js dev server).
  use: {
    baseURL: "http://localhost:3000",
  },

  // The webServer block tells Playwright to START the app itself before running
  // tests, so the suite is self-contained — you don't have to remember to run
  // `next dev` in another terminal first. Playwright runs the command, waits
  // until the url responds, runs the tests, then shuts the server down.
  webServer: {
    command: "npm run dev", // starts `next dev` (see package.json scripts)
    url: "http://localhost:3000",
    // Reuse a server you already have running locally for speed, but always
    // start a fresh one in CI where nothing is running yet.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000, // give Next.js up to 2 minutes for its first cold start
  },

  // A "project" is one browser configuration to run the tests against. Here we
  // run in Chromium using the standard Desktop Chrome preset.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
