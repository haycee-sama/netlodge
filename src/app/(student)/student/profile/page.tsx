"use client";

import * as React from "react";
import { Loader2, User, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils/format";
import { toast } from "sonner";

export default function StudentProfilePage() {
  const { session } = useAuth();
  const [profile, setProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase.from("profiles")
      .select("first_name, last_name, phone, bio, email")
      .eq("id", session!.userId)
      .single()
      .then(({ data, error }) => {
        if (error) toast.error("Could not load profile");
        setProfile(data);
        setLoading(false);
      });
  }, [isSupabaseAuth, session]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isSupabaseAuth || !profile) return;
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({
      first_name: formData.get("firstName"),
      last_name: formData.get("lastName"),
      phone: formData.get("phone"),
      bio: formData.get("bio"),
      updated_at: new Date().toISOString(),
    }).eq("id", session!.userId);
    if (error) {
      toast.error("Could not save profile", { description: error.message });
    } else {
      toast.success("Profile updated");
    }
    setSaving(false);
  }

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader eyebrow="Account" title="Your profile" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in to view your profile.</CardContent></Card>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader eyebrow="Account" title="Your profile" description="Update your personal information." />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials(profile?.first_name ?? session?.firstName ?? "", profile?.last_name ?? session?.lastName ?? "")}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{profile?.first_name} {profile?.last_name}</CardTitle>
              <Badge variant="outline" className="mt-1">{session?.role}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" name="firstName" defaultValue={profile?.first_name ?? ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" name="lastName" defaultValue={profile?.last_name ?? ""} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email ?? ""} disabled className="bg-muted/50" />
              <p className="text-xs text-muted-foreground">Email cannot be changed here. Use Supabase Auth settings.</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} placeholder="+234..." />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" name="bio" defaultValue={profile?.bio ?? ""} rows={3} placeholder="Tell us about yourself..." />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : <><Save className="mr-2 h-4 w-4" /> Save changes</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
