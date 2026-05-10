import type { Metadata } from "next";
import { DensityProvider } from "@/components/providers/density-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <DensityProvider>{children}</DensityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
