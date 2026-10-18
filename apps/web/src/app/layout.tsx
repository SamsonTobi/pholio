import type { Metadata } from "next";
import { Geist, Geist_Mono, Familjen_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { APP_URL } from "@/lib/env";
import { COMPANY_NAME } from "@/lib/company";

const display = Familjen_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: `${COMPANY_NAME} — Small software for specific problems`,
  description:
    "An independent software studio. Booksie, Ralfe, LinkPaddy, OTPBadger and Stall: each one built to solve a single problem well.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${display.variable}`}>
      <body className="min-h-screen bg-background text-foreground font-mono antialiased flex flex-col selection:bg-primary selection:text-primary-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
