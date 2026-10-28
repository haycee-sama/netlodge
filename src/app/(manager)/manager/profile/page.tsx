"use client";

import * as React from "react";
import { Loader2, Save, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { initials } from "@/lib/utils/format";
import { toast } from "sonner";

export default function ManagerProfilePage() {
  const { session } = useAuth();
  const [firstName, setFirstName] = React.useState(session?.firstName ?? "");
  const [lastName, setLastName] = React.useState(session?.lastName ?? "");
  const [phone, setPhone] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function save() {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    toast.success("Profile saved");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Profile" title="Manager profile" description="Your personal details as a property manager." />
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">{initials(session?.firstName, session?.lastName)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="font-display text-lg font-semibold">{session?.firstName} {session?.lastName}</p>
            <p className="text-sm text-muted-foreground">{session?.email}</p>
            <Badge variant="outline">Manager</Badge>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-primary" aria-hidden />Personal details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="firstName">First name</Label><Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="lastName">Last name</Label><Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="phone">Phone</Label><Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={save} disabled={submitting}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Saving…</> : <><Save className="mr-2 h-4 w-4" aria-hidden /> Save profile</>}</Button>
      </div>
    </div>
  );
}
