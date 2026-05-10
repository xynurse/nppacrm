import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sponsorship CRM",
  description:
    "Sponsor outreach for Leadership & Professional Development for NPs & PAs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
