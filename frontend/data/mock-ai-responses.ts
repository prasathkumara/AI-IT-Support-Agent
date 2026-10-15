// Predefined troubleshooting scenarios used by the local mock "AI".
//
// This is plain data — the matching logic lives in lib/mock-ai.ts — so new
// scenarios can be added here without touching any component.
import type { TroubleshootingScenario } from "@/types";

export const troubleshootingScenarios: TroubleshootingScenario[] = [
  {
    id: "vpn",
    label: "VPN Access",
    summary: "Connect securely from anywhere",
    category: "Network",
    priority: "High",
    keywords: ["vpn", "globalprotect", "remote access", "tunnel", "connect from home", "anyconnect"],
    starterQuestion: "My VPN is not connecting. How can I fix it?",
    ticketTitle: "VPN not connecting",
    intro: "Sorry you're having trouble with the VPN. Let's get you reconnected — try these steps in order:",
    steps: [
      "Check that your internet connection works by opening any public website.",
      "Fully quit the VPN client (right-click the tray icon → Exit), then reopen it.",
      "Make sure the portal address is set to vpn.contoso.com.",
      "Sign in again with your company email and approve the MFA prompt on your phone.",
      "If it still fails, restart your computer and connect before opening other apps.",
    ],
  },
  {
    id: "password",
    label: "Password Reset",
    summary: "Reset or unlock your account",
    category: "Account",
    priority: "Medium",
    keywords: ["password", "locked out", "locked", "reset", "forgot", "unlock", "sign in", "login", "log in"],
    starterQuestion: "I forgot my password and I'm locked out. How do I reset it?",
    ticketTitle: "Password reset / account locked",
    intro: "No problem — you can reset your password yourself in a couple of minutes:",
    steps: [
      "Go to passwordreset.contoso.com from any browser (your phone works too).",
      "Enter your work email and complete the verification with your authenticator app or phone.",
      "Choose a new password: at least 12 characters, not used in your last 5 passwords.",
      "Wait about 2 minutes for the change to sync, then sign in with the new password.",
      "On your phone, update the password in Outlook and Teams when prompted.",
    ],
  },
  {
    id: "software",
    label: "Software Installation",
    summary: "Install approved applications",
    category: "Software",
    priority: "Low",
    keywords: ["install", "software", "application", "app", "license", "download", "program", "update"],
    starterQuestion: "How do I install new software on my laptop?",
    ticketTitle: "Software installation request",
    intro: "Most approved apps can be installed without waiting on IT. Here's how:",
    steps: [
      "Open the Company Portal app from the Start menu.",
      "Search for the application you need and select it.",
      "Click Install and keep your laptop connected to power and the network.",
      "Restart the laptop if the installer asks you to.",
      "If the app isn't listed, it needs approval — I can raise a request for you.",
    ],
  },
  {
    id: "email",
    label: "Email Issues",
    summary: "Fix Outlook and sync problems",
    category: "Email",
    priority: "Medium",
    keywords: ["email", "outlook", "mail", "sync", "inbox", "calendar", "mailbox", "not receiving"],
    starterQuestion: "My Outlook email is not syncing. What should I do?",
    ticketTitle: "Email not syncing",
    intro: "Let's get your mailbox syncing again. Please try the following:",
    steps: [
      "Check the status bar at the bottom of Outlook — if it says 'Working Offline', turn offline mode off from the Send/Receive tab.",
      "Close Outlook completely and reopen it.",
      "Open outlook.office.com in a browser to confirm the missing emails are on the server.",
      "In Outlook, go to File → Account Settings → Repair to rebuild the connection.",
      "On mobile, remove and re-add your work account in the Outlook app.",
    ],
  },
  {
    id: "printer",
    label: "Printer Setup",
    summary: "Add and configure printers",
    category: "Hardware",
    priority: "Low",
    keywords: ["printer", "print", "printing", "scanner", "toner", "paper jam"],
    starterQuestion: "How do I set up the office printer on my laptop?",
    ticketTitle: "Printer setup issue",
    intro: "Here's how to add an office printer to your laptop:",
    steps: [
      "Make sure you are connected to the office network or the VPN.",
      "Open Settings → Bluetooth & devices → Printers & scanners.",
      "Click Add device and choose the printer named for your floor (e.g. PRN-3F-01).",
      "If it doesn't appear, click 'Add manually' and enter \\\\print.contoso.com\\PRN-3F-01.",
      "Print a test page to confirm everything works.",
    ],
  },
];

export const resolutionQuestion = "Did this solve your issue?";

export const assistantGreeting =
  "Hi! I'm your AI IT assistant. Describe the problem you're facing and I'll walk you through a fix. You can also pick one of the common questions below.";

export const suggestedQuestions: string[] = troubleshootingScenarios.map((s) => s.starterQuestion);

export const fallbackMessage =
  "I'm not sure I have a guide for that yet. I can help with the topics below — or describe your issue in more detail (for example, which app or device is affected and any error message you see).";
