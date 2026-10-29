"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  User,
  Phone,
  GraduationCap,
  Building2,
  Briefcase,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { registerSchema, type RegisterInput } from "@/lib/validators";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const roleOptions: {
  role: "student" | "landlord" | "manager" | "agent";
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { role: "student", label: "Student", description: "Find and book accommodation", icon: GraduationCap },
  { role: "landlord", label: "Landlord", description: "List and manage properties", icon: Building2 },
  { role: "manager", label: "Manager", description: "Operate assigned properties", icon: Briefcase },
  { role: "agent", label: "Agent", description: "Manage enquiries and referrals", icon: User },
];

export default function RegisterPage() {
  const router = useRouter();
  const [showPw, setShowPw] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "student", acceptTerms: false as unknown as true },
  });

  const selectedRole = watch("role");

  const [authError, setAuthError] = React.useState<string | null>(null);

  async function onSubmit(values: RegisterInput) {
    setSubmitting(true);
    setAuthError(null);
    try {
      // Try real Supabase Auth registration
      const { signUpWithEmail } = await import("@/lib/supabase/auth-service");
      const result = await signUpWithEmail({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        role: values.role,
      });

      if (result.success) {
        const roleLabel = values.role.charAt(0).toUpperCase() + values.role.slice(1);
        toast.success("Account created", {
          description: `Welcome to NetLodge as a ${roleLabel}. Please check your email to verify your account.`,
        });
        // Students go to onboarding after email verification; others go to login
        if (values.role === "student") {
          router.push("/login?registered=true&redirect=/student/onboarding");
        } else {
          router.push("/login?registered=true");
        }
        return;
      }

      // Supabase registration failed — show error (no demo fallback)
      setAuthError(result.error ?? "Registration failed. Please try again.");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center lg:hidden">
          <Logo />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Join NetLodge as a student, landlord, manager or agent.
        </p>
      </div>

      {authError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{authError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Role selector */}
        <div className="space-y-2">
          <Label>I am a…</Label>
          <div className="grid grid-cols-2 gap-2">
            {roleOptions.map((opt) => (
              <button
                key={opt.role}
                type="button"
                onClick={() => setValue("role", opt.role)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                  selectedRole === opt.role
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <opt.icon className={cn("mt-0.5 h-4 w-4", selectedRole === opt.role ? "text-primary" : "text-muted-foreground")} aria-hidden />
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
                {selectedRole === opt.role && (
                  <CheckCircle2 className="ml-auto h-4 w-4 text-primary" aria-hidden />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input id="firstName" className="pl-9" placeholder="Adaeze" {...register("firstName")} />
            </div>
            {errors.firstName && <p role="alert" className="text-xs text-destructive">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" placeholder="Okonkwo" {...register("lastName")} />
            {errors.lastName && <p role="alert" className="text-xs text-destructive">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="email" type="email" autoComplete="email" className="pl-9" placeholder="you@example.com" {...register("email")} />
          </div>
          {errors.email && <p role="alert" className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone (optional)</Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="phone" type="tel" autoComplete="tel" className="pl-9" placeholder="+234 800 000 0000" {...register("phone")} />
          </div>
          {errors.phone && <p role="alert" className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
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
            {errors.password && <p role="alert" className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
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
            {errors.confirmPassword && <p role="alert" className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm" htmlFor="acceptTerms">
          <Checkbox
            id="acceptTerms"
            onCheckedChange={(v) => setValue("acceptTerms", (v === true) as never, { shouldValidate: true })}
          />
          <span className="text-muted-foreground">
            I agree to the{" "}
            <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>,{" "}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, and{" "}
            <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>.
          </span>
        </label>
        {errors.acceptTerms && <p role="alert" className="-mt-3 text-xs text-destructive">{errors.acceptTerms.message}</p>}

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
