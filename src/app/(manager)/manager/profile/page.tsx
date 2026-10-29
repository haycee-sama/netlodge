"use client";

import * as React from "react";
import { Loader2, Save, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils/format";
import { toast } from "sonner";

export default function ManagerProfilePage() {
  const { session } = useAuth();
  const [firstName, setFirstName] = React.useState(session?.firstName ?? "");
  const [lastName, setLastName] = React.useState(session?.lastName ?? "");
  const [phone, setPhone] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Load existing profile from the database
  React.useEffect(() => {
    if (!session?.userId) { setLoading(false); return; }
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("first_name, last_name, phone")
      .eq("id", session.userId)
      .single()
      .then(({ data, error }) => {
        if (error && error.code !== "PGRST116") {
          toast.error("Could not load profile", { description: error.message });
        }
        if (data) {
          setFirstName(data.first_name ?? "");
          setLastName(data.last_name ?? "");
          setPhone(data.phone ?? "");
        }
        setLoading(false);
      });
  }, [session?.userId]);

  async function save() {
    if (!session?.userId) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").update({
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      }).eq("id", session.userId);
      if (error) throw new Error(error.message);
      toast.success("Profile saved");
    } catch (e) {
      toast.error("Could not save profile", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
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
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0801 234 5678" />
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Saving…</> : <><Save className="mr-2 h-4 w-4" aria-hidden /> Save profile</>}
        </Button>
      </div>
    </div>
  );
}
