"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validators";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="h-32 animate-pulse rounded-md bg-muted/40" />}>
      <ResetForm />
    </React.Suspense>
  );
}

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [done, setDone] = React.useState(false);
  const [showPw, setShowPw] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  async function onSubmit(values: ResetPasswordInput) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });
      if (error) {
        toast.error("Password update failed", { description: error.message });
        return;
      }
      setDone(true);
      toast.success("Password updated", {
        description: "You can now sign in with your new password.",
      });
    } catch (e) {
      toast.error("Could not update password", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  }

  if (!token) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <div className="flex justify-center lg:hidden">
            <Logo />
          </div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Invalid reset link</h1>
          <p className="text-sm text-muted-foreground text-pretty">
            This reset link is missing a token. Use the link from your reset email, or request a new one.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <div className="flex justify-center lg:hidden">
            <Logo />
          </div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Password updated</h1>
          <p className="text-sm text-muted-foreground text-pretty">
            Your password has been reset. Sign in with your new password.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center lg:hidden">
          <Logo />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">
          Use at least 8 characters with one uppercase letter and one number.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register("token")} />
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              className="pl-9 pr-10"
              placeholder="••••••••"
              {...register("password")}
            />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPw ? "Hide password" : "Show password"}>
              {showPw ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              className="pl-9 pr-10"
              placeholder="••••••••"
              {...register("confirmPassword")}
            />
            <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showConfirm ? "Hide password" : "Show password"}>
              {showConfirm ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Updating password…
            </>
          ) : (
            <>
              Update password
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
