"use client";

import { useState } from "react";

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || state === "sending") return;
    setState("sending");
    try {
      let repo: string | null = null;
      try {
        repo = sessionStorage.getItem("agentready:paid-repo");
      } catch {}
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          email,
          page: window.location.pathname + window.location.search,
          repo,
        }),
      });
      if (!res.ok) throw new Error();
      setState("sent");
      setMessage("");
      setEmail("");
      setTimeout(() => {
        setOpen(false);
        setState("idle");
      }, 2500);
    } catch {
      setState("error");
    }
  }

  return (
    <div className="fb no-print">
      {open && (
        <div className="fb-panel">
          {state === "sent" ? (
            <p className="fb-thanks">Thanks — that goes straight to us. ✓</p>
          ) : (
            <form onSubmit={submit}>
              <p className="fb-title">What should we improve?</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Wrong score? Missing finding? Confusing step? Tell us."
                rows={4}
                maxLength={4000}
                autoFocus
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional, if you'd like a reply)"
              />
              {state === "error" && (
                <p className="fb-error">Couldn&apos;t send — please try again.</p>
              )}
              <div className="fb-actions">
                <button
                  className="primary fb-send"
                  type="submit"
                  disabled={state === "sending" || !message.trim()}
                >
                  {state === "sending" ? "Sending…" : "Send feedback"}
                </button>
                <button
                  type="button"
                  className="fb-cancel"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
      <button
        className="fb-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (state === "error") setState("idle");
        }}
      >
        {open ? "Close" : "Feedback"}
      </button>
    </div>
  );
}
