import type { Metadata } from "next";
import { Marcellus } from "next/font/google";
import "./globals.css";
import "./visual-polish.css";
import "./form-guidance.css";
import "./transmittal-polish.css";
import "./twilight-refresh.css";

const display = Marcellus({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Municipal Cemetery — Hinigaran",
  description: "Burial permits, exhumation, statements of account, transfers and cemetery transmittal records.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={display.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
