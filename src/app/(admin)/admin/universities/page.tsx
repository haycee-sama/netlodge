"use client";

import * as React from "react";
import { GraduationCap, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function AdminUniversitiesPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newShort, setNewShort] = React.useState("");
  const [newCity, setNewCity] = React.useState("");
  const [newState, setNewState] = React.useState("");
  const [newSlug, setNewSlug] = React.useState("");
  const isSupabaseAuth = session?.authenticated === true;

  const fetchData = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    const { data, error } = await supabase.from("universities").select("*").order("name");
    if (error) setError(error.message);
    else setRows(data ?? []);
    setLoading(false);
  }, [isSupabaseAuth]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCreate() {
    if (!newName.trim() || !newShort.trim() || !newCity.trim() || !newState.trim() || !newSlug.trim()) {
      toast.error("All fields are required"); return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("universities").insert({
      name: newName.trim(), short_name: newShort.trim().toUpperCase(),
      city: newCity.trim(), state: newState.trim(),
      slug: newSlug.trim().toLowerCase().replace(/\s+/g, "-"),
      active: true,
    });
    if (error) toast.error("Failed to create", { description: error.message });
    else {
      toast.success("University added");
      setNewName(""); setNewShort(""); setNewCity(""); setNewState(""); setNewSlug("");
      setShowForm(false);
      await fetchData();
    }
    setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    const supabase = createClient();
    const { error } = await supabase.from("universities").update({ active: !current }).eq("id", id);
    if (error) toast.error("Failed to update");
    else { toast.success("Updated"); await fetchData(); }
  }

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><AdminPageHeader title="Universities" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Platform configuration" title="Universities" description="Manage universities on the platform." breadcrumbs={[{ label: "Super Admin", href: "/admin" }, { label: "Universities" }]}
        actions={<Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" /> Add</Button>} />
      {showForm && (
        <Card><CardHeader><CardTitle className="text-base">New university</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="University of Lagos" /></div>
              <div className="space-y-1"><Label>Short name</Label><Input value={newShort} onChange={(e) => setNewShort(e.target.value)} placeholder="UNILAG" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1"><Label>City</Label><Input value={newCity} onChange={(e) => setNewCity(e.target.value)} /></div>
              <div className="space-y-1"><Label>State</Label><Input value={newState} onChange={(e) => setNewState(e.target.value)} /></div>
              <div className="space-y-1"><Label>Slug</Label><Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="university-of-lagos" /></div>
            </div>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Saving…" : "Create"}</Button>
          </CardContent>
        </Card>
      )}
      {error ? <Card className="border-destructive/40 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card> : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No universities.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 p-4">
                <div className="space-y-1"><div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-muted-foreground" /><p className="font-medium">{u.name}</p><Badge variant="outline">{u.short_name}</Badge></div><p className="text-xs text-muted-foreground">{u.city}, {u.state} · {u.slug}</p></div>
                <div className="flex items-center gap-2"><Badge variant="outline" className={u.active ? "text-success" : "text-destructive"}>{u.active ? "Active" : "Inactive"}</Badge><Button variant="ghost" size="sm" onClick={() => toggleActive(u.id, u.active)}>{u.active ? "Disable" : "Enable"}</Button></div>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
