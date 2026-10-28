"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * OAuth/email confirmation callback.
 *
 * Exchanges the `code` parameter for a Supabase session, then redirects
 * to the user's role-specific dashboard.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = React.useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = React.useState<string>("");

  React.useEffect(() => {
    async function handleCallback() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

        if (error) {
          setErrorMsg(error.message);
          setStatus("error");
          return;
        }

        // Session exchanged successfully. Now resolve the role and redirect.
        const { getCurrentSession } = await import("@/lib/supabase/auth-service");
        const session = await getCurrentSession();

        if (!session) {
          setErrorMsg("Could not resolve your account. Please sign in manually.");
          setStatus("error");
          return;
        }

        const { homeRouteForRole } = await import("@/lib/auth/permissions");
        setStatus("success");

        // Brief delay so the user sees the success state before redirect
        setTimeout(() => {
          router.push(homeRouteForRole(session.role));
        }, 500);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Authentication failed");
        setStatus("error");
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <Card className="max-w-md">
        <CardContent className="space-y-3 p-6">
          {status === "loading" && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              </div>
              <h1 className="font-display text-lg font-semibold">Completing sign-in…</h1>
              <p className="text-sm text-muted-foreground text-pretty">
                We're confirming your identity. You'll be redirected to your dashboard shortly.
              </p>
            </>
          )}
          {status === "success" && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-6 w-6" aria-hidden />
              </div>
              <h1 className="font-display text-lg font-semibold">Sign-in confirmed</h1>
              <p className="text-sm text-muted-foreground text-pretty">
                Redirecting you to your dashboard…
              </p>
            </>
          )}
          {status === "error" && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <AlertCircle className="h-6 w-6" aria-hidden />
              </div>
              <h1 className="font-display text-lg font-semibold">Authentication failed</h1>
              <p className="text-sm text-muted-foreground text-pretty">{errorMsg}</p>
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Back to sign in</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
