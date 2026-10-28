"use client";

import * as React from "react";
import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this would log to Sentry / Datadog.
    console.error("[NetLodge] route error:", error);
  }, [error]);

  // In development, show the actual error message to help debugging.
  const isDev = process.env.NODE_ENV !== "production";
  const errorMessage = isDev ? error.message : undefined;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center">
      <Logo />
      <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground text-pretty">
        An unexpected error occurred while rendering this page. Our team has been notified. You can
        try again, or head back to safety.
      </p>
      {errorMessage && (
        <p className="mt-3 max-w-md rounded-lg bg-muted p-3 text-left font-mono text-xs text-destructive">
          {errorMessage}
        </p>
      )}
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-muted-foreground">Error ID: {error.digest}</p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" aria-hidden />
            Back home
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/contact">
            <LifeBuoy className="mr-2 h-4 w-4" aria-hidden />
            Contact support
          </Link>
        </Button>
      </div>
    </div>
  );
}
