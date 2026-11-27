import type { Metadata } from "next";
import { Cormorant_Garamond, Marcellus } from "next/font/google";
import "./globals.css";
import "./visual-polish.css";
import "./form-guidance.css";
import "./transmittal-polish.css";
import "./twilight-refresh.css";
import "./formal.css";

const display = Marcellus({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const formal = Cormorant_Garamond({ weight: ["500", "600"], subsets: ["latin"], variable: "--font-formal", display: "swap" });

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
    <html lang="en" className={`${display.variable} ${formal.variable}`} data-accent="formal" data-particles="off" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
