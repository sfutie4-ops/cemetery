import type { Metadata } from "next";
import "./globals.css";
import "./visual-polish.css";
import "./form-guidance.css";
import "./transmittal-polish.css";

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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
