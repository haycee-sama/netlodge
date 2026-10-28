"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validators";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values: ForgotPasswordInput) {
    try {
      const { resetPasswordForEmail } = await import("@/lib/supabase/auth-service");
      const result = await resetPasswordForEmail(values.email);
      if (result.success) {
        setSubmitted(values.email);
        toast.success("Reset link sent", {
          description: "Check your inbox for a password reset link.",
        });
      } else {
        toast.error("Could not send reset link", {
          description: result.error ?? "Please try again.",
        });
      }
    } finally {
      // isSubmitting is managed automatically by react-hook-form based on
      // the async onSubmit promise state — no manual setSubmitting needed.
    }
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <div className="flex justify-center lg:hidden">
            <Logo />
          </div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Check your inbox</h1>
          <p className="text-sm text-muted-foreground text-pretty">
            We've sent a password reset link to <strong className="text-foreground">{submitted}</strong>.
            The link expires in 30 minutes.
          </p>
        </div>
        <Card className="border-dashed bg-muted/30">
          <CardContent className="p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Demo mode:</strong> No email is actually sent. In
            production, Supabase Auth sends a password reset email with a tokenised link to{" "}
            <code>/reset-password?token=…</code>.
          </CardContent>
        </Card>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            Back to sign in
          </Link>
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
        <h1 className="font-display text-2xl font-bold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="email" type="email" autoComplete="email" className="pl-9" placeholder="you@example.com" {...register("email")} />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Sending link…
            </>
          ) : (
            <>
              Send reset link
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
