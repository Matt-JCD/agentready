import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentReady — how well can coding agents work in your repo?",
  description:
    "Paste a public GitHub repo and get an agent readiness score, the biggest problems, and the exact changes to fix them.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
