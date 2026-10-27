"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { loginSchema, type LoginInput } from "@/lib/validators";
import { useAuth } from "@/lib/auth/auth-context";
import { homeRouteForRole } from "@/lib/auth/permissions";
import { toast } from "sonner";
import type { UserRole } from "@/lib/types";
import { roleLabel as formatRoleLabel } from "@/lib/types";
import { signInWithEmail } from "@/lib/supabase/auth-service";

const marketplaceDemoAccounts: { role: UserRole; email: string; label: string; description: string }[] = [
  { role: "student", email: "ada@netlodge.demo", label: "Student", description: "Browse, save, book" },
  { role: "landlord", email: "landlord@netlodge.demo", label: "Landlord", description: "List properties, manage rooms" },
  { role: "manager", email: "manager@netlodge.demo", label: "Manager", description: "Operate assigned properties" },
  { role: "agent", email: "agent@netlodge.demo", label: "Agent", description: "Enquiries & referrals" },
];

const adminDemoAccounts: { role: UserRole; email: string; label: string; description: string }[] = [
  { role: "verification_officer", email: "officer@netlodge.demo", label: "Verification Officer", description: "Review KYC & listing submissions" },
  { role: "support_staff", email: "support@netlodge.demo", label: "Support Agent", description: "Handle customer tickets" },
  { role: "finance_admin", email: "finance@netlodge.demo", label: "Finance Admin", description: "Approve payouts & refunds" },
  { role: "super_admin", email: "admin@netlodge.demo", label: "Super Admin", description: "Platform-wide control" },
];

/** Demo-only: infer a user's role from their email address for demo quick-access. */
function inferRoleFromEmail(email: string): UserRole {
  const e = email.toLowerCase();
  if (e.includes("officer") || e.includes("verification")) return "verification_officer";
  if (e.includes("support")) return "support_staff";
  if (e.includes("finance")) return "finance_admin";
  if (e.includes("admin") || e.includes("root")) return "super_admin";
  if (e.includes("landlord")) return "landlord";
  if (e.includes("manager")) return "manager";
  if (e.includes("agent")) return "agent";
  return "student";
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="h-32 animate-pulse rounded-md bg-muted/40" />}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect");
  const { signIn } = useAuth();
  const [showPw, setShowPw] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    setAuthError(null);
    try {
      // Try real Supabase Auth first
      const result = await signInWithEmail(values.email, values.password);
      if (result.success && result.session) {
        toast.success("Signed in", {
          description: `Welcome back. You're now in the ${formatRoleLabel(result.session.role)} workspace.`,
        });
        router.push(redirect ?? homeRouteForRole(result.session.role));
        return;
      }

      // If Supabase auth fails, check if this is a demo account
      if (values.email.endsWith("@netlodge.demo")) {
        // Demo fallback for quick-access accounts
        const role = inferRoleFromEmail(values.email);
        signIn({ email: values.email, role });
        toast.success(`Signed in as ${formatRoleLabel(role)} (demo)`, {
          description: "Demo mode — not connected to Supabase Auth.",
        });
        router.push(redirect ?? homeRouteForRole(role));
        return;
      }

      // Real auth failed and not a demo account — show error
      setAuthError(result.error ?? "Invalid email or password.");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  function quickSignIn(role: UserRole, email: string) {
    signIn({ email, role });
    toast.success(`Signed in as ${formatRoleLabel(role)} (demo)`, {
      description: "Demo mode — not connected to Supabase Auth.",
    });
    router.push(homeRouteForRole(role));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center lg:hidden">
          <Logo />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your NetLodge account to continue.
        </p>
      </div>

      {authError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{authError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="pl-9"
              {...register("email")}
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pl-9 pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground" htmlFor="remember">
          <Checkbox id="remember" defaultChecked />
          <span>Remember me on this device</span>
        </label>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </>
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or try a demo account</span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Marketplace</p>
          <div className="grid grid-cols-2 gap-2">
            {marketplaceDemoAccounts.map((acc) => (
              <Button
                key={acc.role}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => quickSignIn(acc.role, acc.email)}
                className="h-auto flex-col items-start gap-0.5 p-3 text-left"
              >
                <span className="text-sm font-medium">{acc.label}</span>
                <span className="text-xs font-normal text-muted-foreground">{acc.description}</span>
              </Button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Administrative</p>
          <div className="grid grid-cols-2 gap-2">
            {adminDemoAccounts.map((acc) => (
              <Button
                key={acc.role}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => quickSignIn(acc.role, acc.email)}
                className="h-auto flex-col items-start gap-0.5 border-primary/30 bg-primary/5 p-3 text-left hover:bg-primary/10"
              >
                <span className="text-sm font-medium">{acc.label}</span>
                <span className="text-xs font-normal text-muted-foreground">{acc.description}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Authentication:</strong> Real sign-in uses Supabase
          Auth. Demo quick-access buttons create a local preview session for UI testing. New
          registrations always receive the student role only — admin roles require server-side
          assignment.
        </CardContent>
      </Card>
    </div>
  );
}
