"use client";

// 1:1 port of the getreadyforagents.com header (Nav.astro in the
// Matt-JCD/agentic-ready repo). Markup, styles (grfa-nav.css) and the
// interaction script are transcribed verbatim so this app renders the exact
// same component; internal links point at the site, and Agent Ready links
// locally from the Products dropdown. Keep in sync with Nav.astro.
import { useEffect, useRef } from "react";
import navDataJson from "@/lib/nav.generated.json";
import "./grfa-nav.css";

const navData: any = navDataJson;
const PF = "https://prefactor.tech";
const GRFA = "https://www.getreadyforagents.com";
const g = (path: string) => `${GRFA}${path.startsWith("/") ? path : `/${path}`}`;

const livePillars = navData.library.pillars
  .filter((p: any) => p.live || p.pages.some((pg: any) => pg.live))
  .map((p: any) => ({ ...p, pages: p.pages.filter((pg: any) => pg.live) }));
const liveSection = (slug: string) => {
  const s = navData.library.sections.find((x: any) => x.slug === slug);
  const items = s ? s.items.filter((i: any) => i.live) : [];
  return items.length ? { ...s, items } : null;
};
const compareSection = liveSection("compare");
const guidesSection = liveSection("guides");

function CaretDown() {
  return (
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
      <path
        d="M1 1L5 5L9 1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function CaretRight() {
  return (
    <svg width="6" height="10" viewBox="0 0 6 10" fill="none" aria-hidden="true">
      <path
        d="M1 1L5 5L1 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function GrfaNav() {
  const navRef = useRef<HTMLElement>(null);

  // Verbatim port of Nav.astro's initSiteHeader() inline script.
  useEffect(() => {
    const nav = navRef.current as any;
    if (!nav || nav.dataset.headerBound === "true") return;
    nav.dataset.headerBound = "true";
    const hamburger = nav.querySelector(".hamburger");
    const navMenu = nav.querySelector(".nav-r");
    const dropdowns = Array.from(nav.querySelectorAll(".nav-dropdown")) as any[];
    const canHover = window.matchMedia("(hover: hover)").matches;

    function syncNavState() {
      if (hamburger && navMenu) {
        const menuOpen = navMenu.classList.contains("open");
        hamburger.setAttribute("aria-expanded", menuOpen ? "true" : "false");
        hamburger.setAttribute(
          "aria-label",
          menuOpen ? "Close navigation menu" : "Open navigation menu"
        );
      }
      dropdowns.forEach((dd) => {
        const t = dd.querySelector(".nav-dropdown-trigger");
        const menu = dd.querySelector(".nav-dropdown-menu");
        const isOpen = dd.classList.contains("open");
        if (t) t.setAttribute("aria-expanded", isOpen ? "true" : "false");
        if (menu) menu.hidden = !isOpen;
        if (menu && !isOpen) menu.style.removeProperty("--dropdown-shift");
      });
    }

    function clampDropdown(dropdown: any) {
      const menu = dropdown.querySelector(".nav-dropdown-menu");
      if (!menu || window.innerWidth <= 1280) return;
      menu.style.removeProperty("--dropdown-shift");
      const rect = menu.getBoundingClientRect();
      if (!rect.width) return;
      const gutter = 12;
      let shift = 0;
      if (rect.right > window.innerWidth - gutter)
        shift -= rect.right - (window.innerWidth - gutter);
      if (rect.left + shift < gutter) shift += gutter - (rect.left + shift);
      if (Math.abs(shift) > 0.5)
        menu.style.setProperty("--dropdown-shift", shift.toFixed(2) + "px");
    }

    function closeAll(except: any) {
      dropdowns.forEach((dd) => {
        if (dd !== except) dd.classList.remove("open");
      });
    }

    function openDropdown(dropdown: any, focusFirst: boolean) {
      closeAll(dropdown);
      dropdown.classList.add("open");
      syncNavState();
      requestAnimationFrame(() => clampDropdown(dropdown));
      if (focusFirst) {
        const l = dropdown.querySelector(".nav-dropdown-menu a");
        if (l) l.focus();
      }
    }

    function closeMenus() {
      if (navMenu) navMenu.classList.remove("open");
      closeAll(null);
      syncNavState();
    }

    if (hamburger && navMenu) {
      hamburger.addEventListener("click", () => {
        navMenu.classList.toggle("open");
        syncNavState();
      });
    }

    dropdowns.forEach((dropdown) => {
      const trigger = dropdown.querySelector(".nav-dropdown-trigger");
      if (!trigger) return;
      let hoverTimeout: any;
      if (canHover) {
        dropdown.addEventListener("mouseenter", () => {
          clearTimeout(hoverTimeout);
          openDropdown(dropdown, false);
        });
        dropdown.addEventListener("mouseleave", () => {
          hoverTimeout = setTimeout(() => {
            dropdown.classList.remove("open");
            syncNavState();
          }, 150);
        });
      }
      trigger.addEventListener("click", (e: Event) => {
        e.preventDefault();
        if (dropdown.classList.contains("open")) {
          dropdown.classList.remove("open");
          syncNavState();
          return;
        }
        openDropdown(dropdown, false);
      });
      trigger.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          openDropdown(dropdown, true);
        } else if (e.key === "Escape") {
          dropdown.classList.remove("open");
          syncNavState();
          trigger.focus();
        }
      });
      dropdown.addEventListener("focusout", (e: FocusEvent) => {
        if (!dropdown.contains(e.relatedTarget)) {
          dropdown.classList.remove("open");
          syncNavState();
        }
      });
    });

    const onDocClick = (e: Event) => {
      if (!nav.contains(e.target)) closeMenus();
    };
    const onDocKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenus();
    };
    const onResize = () => {
      dropdowns.forEach((dd) => {
        const menu = dd.querySelector(".nav-dropdown-menu");
        if (dd.classList.contains("open")) {
          clampDropdown(dd);
          return;
        }
        if (menu) menu.style.removeProperty("--dropdown-shift");
      });
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onDocKey);
    window.addEventListener("resize", onResize);

    nav.querySelectorAll(".nav-dropdown-menu--flyout").forEach((flyoutMenu: any) => {
      const parentDropdown = flyoutMenu.closest(".nav-dropdown");
      const cats = Array.from(flyoutMenu.querySelectorAll("[data-flyout]")) as any[];
      const catsContainer = flyoutMenu.querySelector(".flyout-categories");
      const panelsContainer = flyoutMenu.querySelector(".flyout-panels");
      const panels = Array.from(
        flyoutMenu.querySelectorAll("[data-flyout-panel]")
      ) as any[];

      function showPanel(key: string) {
        cats.forEach((c) =>
          c.classList.toggle("flyout-active", c.dataset.flyout === key)
        );
        panels.forEach((p) =>
          p.classList.toggle("flyout-visible", p.dataset.flyoutPanel === key)
        );
        if (panelsContainer)
          panelsContainer.classList.toggle("flyout-visible", !!key);
        if (catsContainer) catsContainer.classList.toggle("has-panel", !!key);
        if (parentDropdown) clampDropdown(parentDropdown);
      }
      function hidePanels() {
        cats.forEach((c) => c.classList.remove("flyout-active"));
        panels.forEach((p) => p.classList.remove("flyout-visible"));
        if (panelsContainer) panelsContainer.classList.remove("flyout-visible");
        if (catsContainer) catsContainer.classList.remove("has-panel");
        if (parentDropdown) clampDropdown(parentDropdown);
      }
      cats.forEach((cat) => {
        if (canHover)
          cat.addEventListener("mouseenter", () => showPanel(cat.dataset.flyout));
        cat.addEventListener("click", (e: Event) => {
          const isMobile = !canHover || window.innerWidth <= 768;
          if (isMobile) {
            if (cat.classList.contains("flyout-active")) {
              hidePanels();
            } else {
              e.preventDefault();
              showPanel(cat.dataset.flyout);
            }
          }
        });
      });
      flyoutMenu
        .querySelectorAll(".flyout-cat:not([data-flyout])")
        .forEach((solo: any) => {
          if (canHover) solo.addEventListener("mouseenter", hidePanels);
        });
      if (canHover) flyoutMenu.addEventListener("mouseleave", hidePanels);
    });

    syncNavState();
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onDocKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <nav data-site-header ref={navRef}>
      <div className="nav-brand-wrap">
        <a href={GRFA} className="nav-brand" aria-label="Get Ready for Agents — home">
          <img
            src="/getreadyforagents-logo-white.svg"
            alt="Get Ready for Agents"
            width="162"
            height="16"
          />
        </a>
        <a href={PF} className="nav-byline" target="_blank" rel="noopener">
          by Prefactor
        </a>
      </div>

      <button
        className="hamburger"
        type="button"
        aria-label="Open navigation menu"
        aria-controls="site-nav-menu"
        aria-expanded="false"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className="nav-r" id="site-nav-menu">
        <div className="nav-dropdown" data-dropdown="products">
          <button
            className="nav-dropdown-trigger"
            type="button"
            id="site-nav-products-trigger"
            aria-controls="site-nav-products"
            aria-haspopup="true"
            aria-expanded="false"
          >
            Products <CaretDown />
          </button>
          <div className="nav-dropdown-menu" id="site-nav-products" hidden>
            <span className="dropdown-label">Products</span>
            <a href={g("/signals/")}>Agent Signals</a>
            <a href="/">Agent Ready</a>
          </div>
        </div>
        <a href={g("/news/")}>Agent News</a>
        <a href={g("/podcast/")}>Podcast</a>

        <div className="nav-divider"></div>

        <div className="nav-dropdown" data-dropdown="indices">
          <button
            className="nav-dropdown-trigger"
            type="button"
            id="site-nav-indices-trigger"
            aria-controls="site-nav-indices"
            aria-haspopup="true"
            aria-expanded="false"
          >
            Agent Indices <CaretDown />
          </button>
          <div className="nav-dropdown-menu" id="site-nav-indices" hidden>
            <span className="dropdown-label">Live Indices</span>
            <a href={g("/agentindex/")}>Agent Index</a>
            <a href={g("/jobs/")}>Agentic AI Jobs Index</a>
            <a href={g("/governance-index/")}>AI Governance Index</a>
            <a href={g("/conference-index/")}>AI Conference Index</a>
          </div>
        </div>

        <div className="nav-dropdown" data-dropdown="learn">
          <button
            className="nav-dropdown-trigger"
            type="button"
            aria-controls="site-nav-learn"
            aria-haspopup="true"
            aria-expanded="false"
          >
            Learn <CaretDown />
          </button>
          <div
            className="nav-dropdown-menu nav-dropdown-menu--flyout"
            id="site-nav-learn"
            hidden
          >
            <div className="flyout-categories">
              <span className="dropdown-label">Explore</span>
              {livePillars.map((p: any) => (
                <a href={g(p.hub)} className="flyout-cat" data-flyout={p.slug} key={p.slug}>
                  {p.name}
                  <CaretRight />
                </a>
              ))}
              {compareSection && (
                <a
                  href={g(compareSection.viewAll || "/compare")}
                  className="flyout-cat"
                  data-flyout="compare"
                >
                  Compare
                  <CaretRight />
                </a>
              )}
              {guidesSection && (
                <a
                  href={g(guidesSection.viewAll || "/guides")}
                  className="flyout-cat"
                  data-flyout="guides"
                >
                  Guides
                  <CaretRight />
                </a>
              )}
              <a href={g("/maturity/")} className="flyout-cat flyout-cat--solo">
                Maturity Model
              </a>
              <a href={g("/statistics/")} className="flyout-cat">
                AI Agent Stats
              </a>
            </div>
            <div className="flyout-panels">
              {livePillars.map((p: any) => (
                <div className="flyout-panel" data-flyout-panel={p.slug} key={p.slug}>
                  <span className="dropdown-label">{p.name}</span>
                  <a href={g(p.hub)}>{p.name} overview</a>
                  {p.pages.map((page: any) => (
                    <a href={g(page.href)} key={page.href}>
                      {page.title}
                    </a>
                  ))}
                </div>
              ))}
              {compareSection && (
                <div className="flyout-panel" data-flyout-panel="compare">
                  <span className="dropdown-label">Head to Head</span>
                  {compareSection.items.map((item: any) => (
                    <a href={g(item.href)} key={item.href}>
                      {item.title}
                    </a>
                  ))}
                  {compareSection.viewAll && (
                    <a href={g(compareSection.viewAll)} className="view-all-link">
                      {compareSection.viewAllLabel || "View all"} →
                    </a>
                  )}
                </div>
              )}
              {guidesSection && (
                <div className="flyout-panel" data-flyout-panel="guides">
                  <span className="dropdown-label">Hands-on Guides</span>
                  {guidesSection.items.map((item: any) => (
                    <a href={g(item.href)} key={item.href}>
                      {item.title}
                    </a>
                  ))}
                  {guidesSection.viewAll && (
                    <a href={g(guidesSection.viewAll)} className="view-all-link">
                      {guidesSection.viewAllLabel || "View all"} →
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="nav-dropdown" data-dropdown="resources">
          <button
            className="nav-dropdown-trigger"
            type="button"
            id="site-nav-resources-trigger"
            aria-controls="site-nav-resources"
            aria-haspopup="true"
            aria-expanded="false"
          >
            Resources <CaretDown />
          </button>
          <div className="nav-dropdown-menu" id="site-nav-resources" hidden>
            <span className="dropdown-label">Free Tools</span>
            <a href={`${PF}/agent-risk-audit`} target="_blank" rel="noopener">
              Agent Risk Consultation
            </a>
            <a href="https://getreadyforagents.com" target="_blank" rel="noopener">
              Agent Maturity Assessment
            </a>
            <a href="https://getreadyformcp.com" target="_blank" rel="noopener">
              MCP Maturity Audit
            </a>
            <div className="dropdown-divider"></div>
            <span className="dropdown-label">Prefactor Library</span>
            <a href={`${PF}/download-mcp-whitepaper`} target="_blank" rel="noopener">
              MCP Whitepaper
            </a>
            <a href={`${PF}/glossary`} target="_blank" rel="noopener">
              Glossary
            </a>
            <a href={g("/blog/")}>Blog</a>
            <div className="dropdown-divider"></div>
            <span className="dropdown-label">Company</span>
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
            <a href={`${PF}/partnerships`} target="_blank" rel="noopener">
              Partnerships
            </a>
            <a
              href="https://join.slack.com/t/prefactor-community/shared_invite/zt-3uh6zo0rr-o_iFrujv~evtMstLTup2Lw"
              target="_blank"
              rel="noopener"
            >
              Slack Community
            </a>
          </div>
        </div>

        <form className="nav-search" role="search" action={`${GRFA}/search`} method="get">
          <svg
            className="nav-search-ico"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path
              d="M21 21l-4.3-4.3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="search"
            name="q"
            placeholder="Search"
            aria-label="Search the site"
            autoComplete="off"
          />
        </form>

        <a
          href="https://www.producthunt.com/products/prefactor"
          className="nav-ph"
          target="_blank"
          rel="noopener"
          aria-label="Follow Prefactor on Product Hunt"
        >
          <img src="/product-hunt-icon.svg" alt="" width="20" height="20" />
          <span>Follow on Product Hunt</span>
        </a>
        <a href={g("/#assess")} className="nav-btn">
          Take Assessment
        </a>
      </div>
    </nav>
  );
}
