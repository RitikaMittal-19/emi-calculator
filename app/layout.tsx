import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: "EMI Calculator | Shared Workspace",
  description:
    "Real-time EMI calculator with cross-tab synchronization, amortization schedules, prepayment planning, and loan comparison.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-paper text-ink font-sans transition-colors">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
