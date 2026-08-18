import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import GrfaNav from "./components/GrfaNav";
import GrfaFooter from "./components/GrfaFooter";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-logo",
});

export const metadata: Metadata = {
  title: "Agent Ready — how well can coding agents work in your repo?",
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
      <body className={`${inter.className} ${dmSans.variable}`}>
        <GrfaNav />
        {children}
        <GrfaFooter />
      </body>
    </html>
  );
}
