import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DensityProvider } from "@/components/providers/density-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "LPD Sponsor CRM",
  description:
    "Sponsor outreach management for Leadership & Professional Development for NPs & PAs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <DensityProvider>{children}</DensityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
