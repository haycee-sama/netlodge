"use client";

// global-error.tsx catches errors that the root error.tsx can't —
// specifically errors in the root layout itself. This component
// replaces the entire <html>/<body> tree, so it must render its own
// <html> and <body> tags.
//
// IMPORTANT: This component must NOT use any context hooks (useI18n,
// useAuth, etc.) because the providers are in the root layout which
// may have thrown.

import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a1f1c",
          color: "#e2e8f0",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: "28rem" }}>
          <div
            style={{
              width: "3.5rem",
              height: "3.5rem",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "1rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#94a3b8", marginTop: "0.75rem" }}>
            An unexpected error occurred. Please try again or go back home.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.75rem", fontFamily: "monospace" }}>
              Error ID: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "1.5rem" }}>
            <button
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                background: "#0f766e",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              <RefreshCw size={16} />
              Try again
            </button>
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                background: "transparent",
                color: "#e2e8f0",
                border: "1px solid #334155",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              <Home size={16} />
              Back home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
