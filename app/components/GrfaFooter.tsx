// 1:1 port of the getreadyforagents.com footer (Footer.astro in the
// Matt-JCD/agentic-ready repo). Markup and styles (grfa-footer.css) are
// transcribed verbatim; site-internal links point at getreadyforagents.com.
// Keep in sync with Footer.astro.
import "./grfa-footer.css";

const PF = "https://prefactor.tech";
const GRFA = "https://www.getreadyforagents.com";
const MCP_WHITEPAPER_HREF = `${PF}/download-mcp-whitepaper`;
const siteName = "Get Ready For Agents";

export default function GrfaFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="grfa-footer">
      <div className="grfa-footer-inner">
        <div className="grfa-footer-grid">
          <div className="grfa-footer-brand">
            <a
              href={GRFA}
              className="grfa-footer-logo"
              aria-label={`${siteName} — home`}
            >
              <img
                src="/getreadyforagents-logo-white.svg"
                alt={siteName}
                width="202"
                height="20"
              />
            </a>
            <a href={PF} target="_blank" rel="noopener" className="grfa-footer-byline">
              by Prefactor
            </a>
            <p>
              The hub for getting ready for AI agents — readiness scoring, the
              agentic jobs index, the Agent Reality Index, and the weekly Agent
              Brief, for the leaders driving agent adoption.
            </p>
          </div>

          <div className="grfa-footer-col">
            <h2>Assess</h2>
            <a href={`${GRFA}/ai-agent-readiness-assessment/`}>
              Readiness Assessment
            </a>
            <a href={`${GRFA}/maturity/`}>Maturity Model</a>
            <a href="/">Agent Ready</a>
          </div>

          <div className="grfa-footer-col">
            <h2>Intel</h2>
            <a href={`${GRFA}/blog/`}>Blog</a>
            <a href={`${GRFA}/news/`}>The Agent Brief</a>
            <a href={`${GRFA}/jobs/`}>Agentic AI Jobs</a>
            <a href={`${GRFA}/agentindex/`}>Agent Index</a>
            <a href={`${GRFA}/governance-index/`}>Governance Index</a>
            <a href={`${GRFA}/conference-index/`}>AI Conference Index</a>
          </div>

          <div className="grfa-footer-col">
            <h2>From Prefactor</h2>
            <a href={PF} target="_blank" rel="noopener">
              Prefactor Platform
            </a>
            <a href={`${PF}/agent-risk-audit`} target="_blank" rel="noopener">
              Agent Risk Audit
            </a>
            <a href={MCP_WHITEPAPER_HREF} target="_blank" rel="noopener">
              MCP Whitepaper
            </a>
            <a href={`${PF}/blog`} target="_blank" rel="noopener">
              Blog
            </a>
            <a href={`${PF}/glossary`} target="_blank" rel="noopener">
              Glossary
            </a>
            <a href={`${GRFA}/podcast/`}>Podcast</a>
          </div>

          <div className="grfa-footer-col">
            <h2>Company</h2>
            <a href={`${PF}/about-us`} target="_blank" rel="noopener">
              About Us
            </a>
            <a href={`${PF}/careers`} target="_blank" rel="noopener">
              Careers
            </a>
            <a href={`${PF}/contact`} target="_blank" rel="noopener">
              Contact Us
            </a>
            <a href={`${PF}/community`} target="_blank" rel="noopener">
              News &amp; Events
            </a>
          </div>
        </div>

        <div className="grfa-footer-legal">
          <a href={`${PF}/privacy-policy`} target="_blank" rel="noopener">
            Privacy Policy
          </a>
          <a href={`${PF}/terms-of-service`} target="_blank" rel="noopener">
            Terms of Service
          </a>
          <a href={`${PF}/cookie-policy`} target="_blank" rel="noopener">
            Cookie Policy
          </a>
          <a href={`${PF}/acceptable-use`} target="_blank" rel="noopener">
            Acceptable Use
          </a>
        </div>

        <div className="grfa-footer-bottom">
          <span>
            &copy; {year} Prefactor Pty Ltd · {siteName} is a Prefactor project
          </span>
          <div className="grfa-footer-social">
            <a
              href="https://buttondown.com/prefactor"
              className="grfa-newsletter-link"
              target="_blank"
              rel="noopener"
            >
              Subscribe to the Agent Brief &rarr;
            </a>
            <a
              href="https://join.slack.com/t/prefactor-community/shared_invite/zt-3uh6zo0rr-o_iFrujv~evtMstLTup2Lw"
              target="_blank"
              rel="noopener"
              className="grfa-slack-link"
              aria-label="Join the Prefactor Slack Community"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 54 54"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M19.7 33.7a4.4 4.4 0 1 1-4.4-4.4h4.4v4.4zM22 33.7a4.4 4.4 0 0 1 8.8 0v11a4.4 4.4 0 1 1-8.8 0v-11z"
                  fill="currentColor"
                />
                <path
                  d="M26.4 19.7a4.4 4.4 0 1 1 4.4-4.4v4.4h-4.4zM26.4 22a4.4 4.4 0 0 1 0 8.8H15.4a4.4 4.4 0 1 1 0-8.8h11z"
                  fill="currentColor"
                />
                <path
                  d="M40.3 26.4a4.4 4.4 0 1 1 4.4 4.4h-4.4v-4.4zM38 26.4a4.4 4.4 0 0 1-8.8 0V15.4a4.4 4.4 0 1 1 8.8 0v11z"
                  fill="currentColor"
                />
                <path
                  d="M34.3 40.3a4.4 4.4 0 1 1-4.4 4.4v-4.4h4.4zM34.3 38a4.4 4.4 0 0 1 0-8.8h11a4.4 4.4 0 1 1 0 8.8h-11z"
                  fill="currentColor"
                />
              </svg>
              Slack Community
            </a>
          </div>
          <span>Backed by Antler, Black Nova VC &amp; Func Ventures</span>
        </div>
      </div>
    </footer>
  );
}
