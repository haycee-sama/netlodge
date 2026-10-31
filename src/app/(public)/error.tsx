"use client";

import * as React from "react";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

// IMPORTANT: This error boundary must NOT use useI18n() or any other
// context hook. If the error was caused by a provider failure (e.g.,
// I18nProvider threw), using useI18n() here would cascade the error
// to the root error boundary, showing "Something went wrong" instead
// of this page. Error boundaries must be self-contained.

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[public] route error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 text-destructive mx-auto">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="mt-4 font-display text-xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We couldn&rsquo;t load this page. Please try again.
      </p>
      {process.env.NODE_ENV !== "production" && (
        <p className="mt-3 rounded-md bg-muted p-2 text-xs text-muted-foreground">{error.message}</p>
      )}
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden /> Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/"><Home className="mr-2 h-4 w-4" aria-hidden /> Home</Link>
        </Button>
      </div>
    </div>
  );
}
