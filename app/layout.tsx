import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { DensityProvider } from "@/components/providers/density-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

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
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider>
          <DensityProvider>{children}</DensityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
