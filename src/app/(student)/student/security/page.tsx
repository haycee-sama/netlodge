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
import { toast } from "sonner";

export default function StudentSecurityPage() {
  const { session } = useAuth();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Security"
        title="Security settings"
        description="Manage your password, two-factor authentication and active sessions."
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
              <Input id="currentPw" type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPw">New password</Label>
              <Input id="newPw" type="password" placeholder="••••••••" />
            </div>
          </div>
          <Button
            onClick={() => toast.success("Password updated", { description: "Demo mode — no real backend." })}
          >
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
            <Badge variant="outline">Not enabled</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">SMS verification</p>
              <p className="text-xs text-muted-foreground">Receive codes by SMS</p>
            </div>
            <Badge variant="outline">Not enabled</Badge>
          </div>
          <Button variant="outline" onClick={() => toast.info("2FA setup", { description: "Demo mode — would launch a setup wizard." })}>
            Enable 2FA
          </Button>
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
              <p className="text-sm font-medium">Current device</p>
              <p className="text-xs text-muted-foreground">Chrome on macOS · Yaba, Lagos</p>
            </div>
            <Badge className="bg-success/15 text-success">Active</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast.success("Signed out other devices")}>
            Sign out all other devices
          </Button>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Deleting your account is permanent. Your bookings will be cancelled and your data will be
            removed after the retention period required by Nigerian financial regulations (6 years
            for tax records).
          </p>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => toast.error("Account deletion", { description: "Demo mode — no real action taken." })}
          >
            Delete account
          </Button>
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-start gap-2 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            <strong className="text-foreground">Demo mode:</strong> Security actions are simulated.
            In production, these flows use Supabase Auth's password update, MFA enrolment, and
            session revocation endpoints.
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
