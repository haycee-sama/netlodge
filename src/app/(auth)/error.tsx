"use client";

import * as React from "react";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[auth] route error:", error);
  }, [error]);

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
        We couldn&rsquo;t load this page. Please try again, or head back home.
      </p>
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
      </div>
    </div>
  );
}
