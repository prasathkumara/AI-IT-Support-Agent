// End-to-end test of the full employee journey in the frontend prototype:
//   Login → Dashboard → AI Support → describe issue → troubleshooting steps
//   → resolve OR escalate to a ticket → dashboard counts update.
//
// Everything is simulated locally (localStorage + mock AI), so each test
// starts in a fresh browser context with empty storage.
import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("alex.morgan@contoso.com");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

function stat(page: Page, label: string) {
  return page.getByTestId(`stat-${label}`);
}

test("login validates the email address", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("#email-error")).toContainText("enter your work email");

  await page.getByLabel("Work email").fill("not-an-email");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("#email-error")).toContainText("valid email");
  await expect(page).toHaveURL(/\/login$/);
});

test("signed-out visitors are redirected to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("resolving an issue with the AI does not create a ticket", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { name: /Alex!/ })).toBeVisible();
  await expect(stat(page, "Total tickets")).toHaveText("5");

  await page.getByRole("link", { name: /Chat with AI/ }).first().click();
  await expect(page).toHaveURL(/\/ai-support$/);
  await expect(page.getByRole("heading", { name: "AI Support" })).toBeVisible();

  const input = page.getByLabel("Message the AI assistant");
  await input.fill("I forgot my password");
  await input.press("Enter");

  await expect(page.getByText("passwordreset.contoso.com")).toBeVisible();
  await expect(page.getByText("Did this solve your issue?")).toBeVisible();
  await page.getByRole("button", { name: "Yes, it works" }).click();

  await expect(page.getByText(/glad that fixed it/)).toBeVisible();
  await page.getByRole("button", { name: "Start a new chat" }).click();
  await expect(page.getByText(/glad that fixed it/)).toHaveCount(0);

  await page.getByRole("link", { name: "Home" }).first().click();
  await expect(stat(page, "Total tickets")).toHaveText("5");
});

test("topic card escalates to a confirmed ticket that updates the dashboard", async ({ page }) => {
  await signIn(page);
  await expect(stat(page, "Total tickets")).toHaveText("5");
  await expect(stat(page, "Open")).toHaveText("1");

  // Clicking a popular topic opens AI Support and asks the question automatically.
  await page.getByRole("link", { name: /VPN Access/ }).click();
  await expect(page).toHaveURL(/\/ai-support/);
  await expect(page.getByText("My VPN is not connecting. How can I fix it?").first()).toBeVisible();
  await expect(page.getByText("vpn.contoso.com")).toBeVisible();

  await page.getByRole("button", { name: "No, still an issue" }).click();
  await expect(page.getByRole("heading", { name: "Review ticket before submitting" })).toBeVisible();
  await expect(page.getByText("INC-1043")).toBeVisible();

  await page.getByRole("button", { name: /Confirm & create ticket/ }).click();
  await expect(page.getByText(/Your ticket INC-1043 has been created/)).toBeVisible();

  await page.getByRole("link", { name: "View on dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(stat(page, "Total tickets")).toHaveText("6");
  await expect(stat(page, "Open")).toHaveText("2");
  await expect(page.getByText("VPN not connecting").first()).toBeVisible();
  await expect(page.getByText("INC-1043 created")).toBeVisible();
});

test("cancelling the ticket draft creates nothing", async ({ page }) => {
  await signIn(page);
  await page.goto("/ai-support?topic=printer");
  await expect(page.getByText("Did this solve your issue?")).toBeVisible();
  await page.getByRole("button", { name: "No, still an issue" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText(/haven't created a ticket/)).toBeVisible();

  await page.goto("/dashboard");
  await expect(stat(page, "Total tickets")).toHaveText("5");
});

test("unknown questions get a generic reply with suggested topics", async ({ page }) => {
  await signIn(page);
  await page.goto("/ai-support");
  const input = page.getByLabel("Message the AI assistant");
  await input.fill("Can I get a standing desk?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(/not sure I have a guide for that/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Yes, it works" })).toHaveCount(0);
});
