// End-to-end tests for the two roles:
//   - an employee creates tickets and only ever sees their own
//   - the IT admin sees every employee's tickets, assigns them to any admin
//     and resolves them (but never creates tickets)
//   - each role is kept out of the other's pages
import { expect, test, type Page } from "@playwright/test";

async function signInAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Continue" }).click();
  // Sign-in is simulated with a short delay; wait until it has navigated away.
  await expect(page).not.toHaveURL(/\/login$/);
}

function stat(page: Page, label: string) {
  return page.getByTestId(`stat-${label}`);
}

test("employee creates a ticket from My Tickets and only sees their own", async ({ page }) => {
  await signInAs(page, "alex.morgan@contoso.com");
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/tickets");
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await expect(page.getByText("INC-1042").first()).toBeVisible();
  // Other employees' tickets are hidden.
  await expect(page.getByText("Laptop battery drains in under an hour")).toHaveCount(0);

  await page.getByRole("button", { name: "New ticket" }).click();
  await page.getByRole("button", { name: "Submit ticket" }).click();
  await expect(page.getByText("Please add a subject and describe the issue.")).toBeVisible();

  await page.getByLabel("Subject").fill("Monitor flickers when docked");
  await page.getByLabel("Category").selectOption("Hardware");
  await page.getByLabel("Description").fill("External monitor flickers every few seconds on the dock.");
  await page.getByRole("button", { name: "Submit ticket" }).click();
  await expect(page.getByText("Ticket INC-1043 has been created")).toBeVisible();
  await expect(page.getByText("Monitor flickers when docked").first()).toBeVisible();

  await page.getByRole("link", { name: "Home" }).first().click();
  await expect(stat(page, "Total tickets")).toHaveText("6");
});

test("admin assigns a ticket to another admin and resolves it", async ({ page }) => {
  await signInAs(page, "it.admin@contoso.com");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: /Welcome back, Jordan/ })).toBeVisible();
  await expect(stat(page, "Total tickets")).toHaveText("8");
  // Admins only manage tickets — there is no way to create one.
  await expect(page.getByRole("button", { name: "New ticket" })).toHaveCount(0);

  await page.getByRole("link", { name: "All Tickets" }).first().click();
  await expect(page).toHaveURL(/\/admin\/tickets$/);
  await expect(page.getByText("Sam Patel").first()).toBeVisible();
  await expect(page.getByText("Alex Morgan").first()).toBeVisible();

  // Assigning an Open ticket moves it to In Progress.
  await page.getByLabel("Assign INC-1040").first().selectOption({ label: "Priya Shah" });
  await page.getByLabel("Filter by assignee").selectOption("unassigned");
  await expect(page.getByText("INC-1040")).toHaveCount(0);
  await page.getByLabel("Filter by assignee").selectOption("anyone");

  // Open the ticket, resolve it from the detail page.
  await page.getByRole("link", { name: "INC-1040" }).first().click();
  await expect(page).toHaveURL(/\/admin\/tickets\/INC-1040$/);
  await expect(page.getByRole("heading", { name: "Laptop battery drains in under an hour" })).toBeVisible();
  await expect(page.getByText("In Progress").first()).toBeVisible();
  await page.getByRole("button", { name: "Mark as resolved" }).click();
  await expect(page.getByText(/Resolved by Priya Shah/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark as resolved" })).toHaveCount(0);

  await page.getByRole("link", { name: "All tickets" }).first().click();
  await page.getByRole("button", { name: /^Resolved/ }).click();
  await expect(page.getByText("Laptop battery drains in under an hour").first()).toBeVisible();
});

test("resolving an unassigned ticket assigns it to the resolving admin", async ({ page }) => {
  await signInAs(page, "it.admin@contoso.com");
  await page.goto("/admin/tickets");
  await page.getByLabel("Search tickets", { exact: true }).fill("INC-1039");
  await page.getByRole("button", { name: "Resolve INC-1039" }).first().click();
  await page.getByRole("link", { name: "INC-1039" }).first().click();
  await expect(page.getByText(/Resolved by Jordan Lee/)).toBeVisible();
});

test("a ticket created by an employee shows up for the admin", async ({ page }) => {
  await signInAs(page, "alex.morgan@contoso.com");
  await page.goto("/tickets");
  await page.getByRole("button", { name: "New ticket" }).click();
  await page.getByLabel("Subject").fill("Need access to the design drive");
  await page.getByLabel("Description").fill("Please grant read/write access to the Design shared drive.");
  await page.getByRole("button", { name: "Submit ticket" }).click();
  await expect(page.getByText("Ticket INC-1043 has been created")).toBeVisible();

  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();

  await signInAs(page, "it.admin@contoso.com");
  await page.goto("/admin/tickets");
  await expect(page.getByText("Need access to the design drive").first()).toBeVisible();
  await page.getByLabel("Assign INC-1043").first().selectOption({ label: "Daniel Kim" });

  // The employee sees who is working on it.
  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await signInAs(page, "alex.morgan@contoso.com");
  await page.goto("/tickets");
  const row = page.getByRole("row", { name: /INC-1043/ });
  await expect(row).toContainText("Daniel Kim");
  await expect(row).toContainText("In Progress");
  await page.goto("/dashboard");
  await expect(page.getByText("INC-1043 assigned to Daniel Kim")).toBeVisible();
});

test("the email decides the role — an unknown email can never open the admin portal", async ({ page }) => {
  await signInAs(page, "someone.else@contoso.com");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("each role is redirected away from the other's pages", async ({ page }) => {
  await signInAs(page, "alex.morgan@contoso.com");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/admin/tickets");
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("button", { name: "Open profile menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();

  await signInAs(page, "it.admin@contoso.com");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/tickets");
  await expect(page).toHaveURL(/\/admin$/);
});
