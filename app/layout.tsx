import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
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

const GRFA = "https://www.getreadyforagents.com";
const PF = "https://prefactor.tech";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const year = new Date().getFullYear();
  return (
    <html lang="en">
      <body className={`${inter.className} ${dmSans.variable}`}>
        <header className="site-head">
          <div className="head-inner">
            <div className="head-brand">
              <a className="logo" href="/">
                agent <span>ready</span>
              </a>
              <a
                className="byline"
                href={GRFA}
                target="_blank"
                rel="noopener noreferrer"
              >
                by Get Ready for Agents
              </a>
            </div>
            <nav className="head-links">
              <a href={`${GRFA}/news/`} target="_blank" rel="noopener noreferrer">
                The Agent Brief
              </a>
              <a href={GRFA} target="_blank" rel="noopener noreferrer">
                getreadyforagents.com
              </a>
            </nav>
          </div>
        </header>

        {children}

        <footer className="site-foot">
          <div className="foot-inner">
            <div className="foot-brand">
              <span className="logo logo--sm">
                agent <span>ready</span>
              </span>
              <p>
                Repo readiness scoring for coding agents. Part of Get Ready for
                Agents, a Prefactor project.
              </p>
            </div>
            <div className="foot-col">
              <h2>Get Ready for Agents</h2>
              <a href={GRFA} target="_blank" rel="noopener noreferrer">
                getreadyforagents.com
              </a>
              <a
                href={`${GRFA}/ai-agent-readiness-assessment/`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Readiness Assessment
              </a>
              <a href={`${GRFA}/news/`} target="_blank" rel="noopener noreferrer">
                The Agent Brief
              </a>
              <a href={`${GRFA}/jobs/`} target="_blank" rel="noopener noreferrer">
                Agentic Jobs Index
              </a>
            </div>
            <div className="foot-col">
              <h2>Prefactor</h2>
              <a href={PF} target="_blank" rel="noopener noreferrer">
                Prefactor Platform
              </a>
              <a
                href={`${PF}/privacy-policy`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>
              <a
                href={`${PF}/terms-of-service`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>
            </div>
          </div>
          <div className="foot-bottom">
            © {year} Prefactor Pty Ltd · Agent Ready is a Get Ready for Agents
            product
          </div>
        </footer>
      </body>
    </html>
  );
}
