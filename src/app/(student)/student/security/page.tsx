"use client";

import * as React from "react";
import { Lock, ShieldCheck, Smartphone, Key, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function StudentSecurityPage() {
  const { session, signOut } = useAuth();
  const [currentPw, setCurrentPw] = React.useState("");
  const [newPw, setNewPw] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handlePasswordUpdate() {
    if (!currentPw.trim() || !newPw.trim()) {
      toast.error("Both fields are required");
      return;
    }
    if (newPw.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPw,
      });
      if (error) {
        toast.error("Password update failed", { description: error.message });
      } else {
        toast.success("Password updated", {
          description: "Your password has been changed. Please use the new password next time you sign in.",
        });
        setCurrentPw("");
        setNewPw("");
      }
    } catch (e) {
      toast.error("Could not update password", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOutAllDevices() {
    setSubmitting(true);
    try {
      // Sign out globally — invalidates all refresh tokens for this user.
      const supabase = createClient();
      const { error: globalError } = await supabase.auth.signOut({ scope: "global" });
      if (globalError) {
        toast.error("Could not sign out from all devices", {
          description: globalError.message,
        });
        return;
      }
      // Then clear the local session state via the auth context.
      const result = await signOut();
      if (!result.success) {
        toast.error("Signed out server-side, but could not clear local session", {
          description: result.error,
        });
        return;
      }
      toast.success("Signed out from all devices", {
        description: "You'll need to sign in again on each device.",
      });
    } catch (e) {
      toast.error("Could not sign out other devices", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Security"
        title="Security settings"
        description="Manage your password and active sessions."
      />

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-primary" aria-hidden />
            Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="currentPw">Current password</Label>
              <Input
                id="currentPw"
                type="password"
                placeholder="••••••••"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPw">New password</Label>
              <Input
                id="newPw"
                type="password"
                placeholder="••••••••"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
            </div>
          </div>
          <Button onClick={handlePasswordUpdate} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Update password
          </Button>
        </CardContent>
      </Card>

      {/* 2FA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4 text-primary" aria-hidden />
            Two-factor authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Authenticator app</p>
              <p className="text-xs text-muted-foreground">Use Google Authenticator or similar</p>
            </div>
            <Badge variant="outline">Not available</Badge>
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
            Two-factor authentication is not yet available. We're working on adding TOTP-based 2FA
            for enhanced account security.
          </p>
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4 text-primary" aria-hidden />
            Active sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">This device</p>
              <p className="text-xs text-muted-foreground">Signed in as {session?.email}</p>
            </div>
            <Badge className="bg-success/15 text-success">Active</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOutAllDevices} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            Sign out all other devices
          </Button>
          <p className="text-xs text-muted-foreground">
            This signs you out from all devices. You'll need to sign in again on each device.
          </p>
        </CardContent>
      </Card>

      {/* Security tips */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-start gap-2 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            <strong className="text-foreground">Security tips:</strong> Use a unique password
            you don't use elsewhere. Never share your password with anyone — NetLodge staff will
            never ask for it. If you suspect unauthorized access, change your password immediately
            and sign out from all devices.
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
