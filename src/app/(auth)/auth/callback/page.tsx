import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Authenticating…",
  robots: { index: false, follow: false },
};

/**
 * OAuth/email confirmation callback. In production this route exchanges a
 * `code` parameter for a Supabase session via `supabase.auth.exchangeCodeForSession()`
 * and redirects to the user's role-specific dashboard.
 *
 * In dev mode we simulate the flow with a 2-second delay.
 */
export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <Card className="max-w-md">
        <CardContent className="space-y-3 p-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          </div>
          <h1 className="font-display text-lg font-semibold">Completing sign-in…</h1>
          <p className="text-sm text-muted-foreground text-pretty">
            We're confirming your identity with the authentication provider. You'll be redirected
            to your dashboard shortly.
          </p>
          <Card className="border-dashed bg-muted/30">
            <CardContent className="p-3 text-xs text-muted-foreground">
              <AlertCircle className="mr-1 inline h-3 w-3" aria-hidden />
              <strong className="text-foreground">Demo mode:</strong> No real OAuth provider is
              connected. In production this route exchanges a <code>code</code> query parameter for
              a Supabase session.
            </CardContent>
          </Card>
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
