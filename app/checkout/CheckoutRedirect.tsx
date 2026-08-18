"use client";

import { useEffect } from "react";

// Bridge between the Astro landing page and Stripe: lands on the app's
// origin so the repo can be stored in sessionStorage (the post-payment
// /report page reads it back), then forwards to the Stripe Payment Link.
export default function CheckoutRedirect({
  repo,
  stripeUrl,
}: {
  repo: string | null;
  stripeUrl: string | null;
}) {
  useEffect(() => {
    try {
      if (repo) sessionStorage.setItem("agentready:paid-repo", repo);
    } catch {}
    if (stripeUrl) {
      let target = stripeUrl;
      if (repo) {
        // Bind the repo to the Stripe session (base64url survives Stripe's
        // client_reference_id charset rules); the report API decodes it after
        // verifying the session is paid.
        const ref = btoa(repo)
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
        target += (target.includes("?") ? "&" : "?") + "client_reference_id=" + ref;
      }
      window.location.replace(target);
    }
  }, [repo, stripeUrl]);

  return (
    <main className="wrap">
      <div className="logo" style={{ marginBottom: 20 }}>
        agent <span>ready</span>
      </div>
      {stripeUrl ? (
        <p className="loading">
          Taking you to secure checkout <span className="dot">●</span>
        </p>
      ) : (
        <p className="error">
          Payments aren&apos;t configured yet. Please try again shortly.
        </p>
      )}
      {repo && (
        <p className="footer">
          After payment you&apos;ll land straight on the full report for {repo}.
        </p>
      )}
    </main>
  );
}
