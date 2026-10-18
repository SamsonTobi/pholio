// Single source of truth for the parent-company site.
export const COMPANY_NAME = "Pholio";
export const COMPANY_GITHUB = "https://github.com/SamsonTobi";

export type Product = {
  name: string;
  href: string;
  host: string;
  kind: string;
  platform: string;
  summary: string;
};

export const PRODUCTS: Product[] = [
  {
    name: "Booksie",
    href: "https://booksie.cc",
    host: "booksie.cc",
    kind: "Reading",
    platform: "Mac · Windows",
    summary:
      "Read five pages a day and keep a streak. Your EPUB, PDF and DOCX library stays on your device.",
  },
  {
    name: "Ralfe",
    href: "https://ralfe.vercel.app",
    host: "ralfe.vercel.app",
    kind: "Job search",
    platform: "Terminal · Desktop",
    summary:
      "A local-first job application agent that lives in your terminal and keeps your data on your machine.",
  },
  {
    name: "LinkPaddy",
    href: "https://linkpaddy.vercel.app",
    host: "linkpaddy.vercel.app",
    kind: "Sharing",
    platform: "Chrome · Edge · Brave",
    summary:
      "Send a link or a short note to chosen friends without leaving the page, then see who opened it.",
  },
  {
    name: "OTPBadger",
    href: "https://otpbadger.com",
    host: "otpbadger.com",
    kind: "Productivity",
    platform: "Chrome · Edge",
    summary:
      "Finds the verification code in your Gmail and fills it in when you click. Email is read on your device only.",
  },
  {
    name: "Stall",
    href: "https://paywithstall.com",
    host: "paywithstall.com",
    kind: "Payments",
    platform: "Web · Nigeria",
    summary:
      "Save toward a product with a verified merchant, lock the price, and release the money when you receive it.",
  },
];

export const PRINCIPLES = [
  {
    title: "One problem each",
    body: "Every product starts with a single, specific annoyance. If it needs a long explanation, we cut it down.",
  },
  {
    title: "Your data stays yours",
    body: "We lean local-first: files, mail and history live on your device wherever the product allows it.",
  },
  {
    title: "Say only what it does",
    body: "No invented claims in the product or on its page. If a feature isn't shipped, we don't list it.",
  },
  {
    title: "Ship, then keep shipping",
    body: "Small releases, public changelogs, and products that stay maintained after launch day.",
  },
];

export const IN_PROGRESS = [
  {
    name: "Murshid",
    summary: "An Umrah companion for iOS and Android. Core guidance works offline with no account.",
  },
  {
    name: "Shipfolio",
    summary: "A self-updating portfolio that reads your GitHub and your coding agent, so your showcase stays current as you ship.",
  },
];
