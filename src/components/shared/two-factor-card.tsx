"use client";

import * as React from "react";
import { Loader2, ShieldCheck, Smartphone, Copy, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type EnrollmentState = "idle" | "enrolling" | "verifying" | "enabled" | "error";

export function TwoFactorCard() {
  const [state, setState] = React.useState<EnrollmentState>("idle");
  const [factorId, setFactorId] = React.useState<string | null>(null);
  const [qrUrl, setQrUrl] = React.useState<string | null>(null);
  const [secret, setSecret] = React.useState<string | null>(null);
  const [verifyCode, setVerifyCode] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  // Check if the user already has a verified TOTP factor on mount
  React.useEffect(() => {
    checkExistingFactors();
  }, []);

  async function checkExistingFactors() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) return;
      const totpFactor = data?.totp?.find((f) => f.status === "verified");
      if (totpFactor) {
        setState("enabled");
        setFactorId(totpFactor.id);
      }
    } catch {
      // ignore — user may not have MFA enabled
    }
  }

  async function startEnrollment() {
    setState("enrolling");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator app",
      });
      if (error) throw error;
      if (data.totp) {
        setFactorId(data.id);
        setQrUrl(data.totp.qr_code);
        setSecret(data.totp.secret);
        setState("verifying");
        toast.success("Scan the QR code", {
          description: "Use Google Authenticator, Authy, or 1Password to scan.",
        });
      }
    } catch (e) {
      setState("error");
      toast.error("Could not start 2FA enrollment", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  }

  async function verifyAndEnable() {
    if (!factorId || !verifyCode.trim()) return;
    try {
      const supabase = createClient();
      const { error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: factorId, // The challenge ID is the factor ID for TOTP
        code: verifyCode.trim(),
      });
      if (verifyError) throw verifyError;

      setState("enabled");
      setQrUrl(null);
      setSecret(null);
      setVerifyCode("");
      toast.success("2FA enabled", {
        description: "Your account is now protected with two-factor authentication.",
      });
    } catch (e) {
      toast.error("Could not verify code", {
        description: e instanceof Error ? e.message : "Check the code and try again.",
      });
    }
  }

  async function disable2FA() {
    if (!factorId) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setState("idle");
      setFactorId(null);
      toast.success("2FA disabled", {
        description: "Your account no longer requires a second factor.",
      });
    } catch (e) {
      toast.error("Could not disable 2FA", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  }

  function copySecret() {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="h-4 w-4 text-primary" aria-hidden />
          Two-factor authentication
          {state === "enabled" && (
            <Badge className="bg-success/15 text-success">
              <ShieldCheck className="mr-1 h-3 w-3" aria-hidden />
              Enabled
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {state === "idle" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Authenticator app (TOTP)</p>
                <p className="text-xs text-muted-foreground">Use Google Authenticator, Authy, or 1Password</p>
              </div>
              <Button size="sm" onClick={startEnrollment}>Enable</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">SMS verification</p>
                <p className="text-xs text-muted-foreground">Receive codes by SMS</p>
              </div>
              <Badge variant="outline">Not available</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Two-factor authentication adds an extra layer of security. After enabling, you'll need
              a code from your authenticator app in addition to your password when signing in.
            </p>
          </>
        )}

        {state === "enrolling" && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
          </div>
        )}

        {state === "verifying" && qrUrl && (
          <div className="space-y-4">
            <p className="text-sm font-medium">Step 1: Scan this QR code</p>
            <div className="flex justify-center rounded-lg border border-border bg-white p-4">
              <img src={qrUrl} alt="QR code for authenticator app" width={200} height={200} />
            </div>
            {secret && (
              <div className="space-y-1.5">
                <Label htmlFor="secret">Can't scan? Enter this code manually:</Label>
                <div className="flex items-center gap-2">
                  <Input id="secret" readOnly value={secret} className="font-mono text-xs" />
                  <Button size="sm" variant="outline" onClick={copySecret} className="shrink-0">
                    {copied ? <CheckCircle2 className="h-4 w-4 text-success" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                  </Button>
                </div>
              </div>
            )}
            <Separator />
            <p className="text-sm font-medium">Step 2: Enter the 6-digit code from your app</p>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="verifyCode">Verification code</Label>
                <Input
                  id="verifyCode"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-lg tracking-widest"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>
              <Button onClick={verifyAndEnable} disabled={verifyCode.length !== 6}>
                Verify &amp; enable
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setState("idle"); setQrUrl(null); setSecret(null); }}>
              Cancel
            </Button>
          </div>
        )}

        {state === "enabled" && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
              <div className="flex-1">
                <p className="text-sm font-medium text-success">Two-factor authentication is active</p>
                <p className="text-xs text-muted-foreground">
                  You'll need a code from your authenticator app when signing in.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={disable2FA}>
              Disable 2FA
            </Button>
          </div>
        )}

        {state === "error" && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Could not start enrollment</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setState("idle")}>
                Try again
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
