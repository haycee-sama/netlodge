"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Loader2, Layers, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { fetchFloors, createFloor, deleteFloor } from "@/lib/supabase/landlord-service";
import { toast } from "sonner";

export default function FloorsPage() {
  const params = useParams<{ id: string }>();
  const { session } = useAuth();
  const [floors, setFloors] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [newLabel, setNewLabel] = React.useState("");
  const [newLevel, setNewLevel] = React.useState("1");
  const [creating, setCreating] = React.useState(false);
  const isSupabaseAuth = session?.authenticated === true;

  const fetchFloorsData = React.useCallback(async () => {
    if (!isSupabaseAuth || !params.id) { setLoading(false); return; }
    const res = await fetchFloors(params.id);
    if (res.error) setError(res.error);
    else setFloors(res.data ?? []);
    setLoading(false);
  }, [isSupabaseAuth, params.id]);

  React.useEffect(() => { fetchFloorsData(); }, [fetchFloorsData]);

  async function handleCreate() {
    if (!newLabel.trim()) { toast.error("Floor label is required"); return; }
    setCreating(true);
    const res = await createFloor({
      propertyId: params.id!,
      label: newLabel.trim(),
      level: Number(newLevel) || 1,
    });
    if (res.error) toast.error("Failed to create floor", { description: res.error });
    else { toast.success("Floor added"); setNewLabel(""); setNewLevel("1"); await fetchFloorsData(); }
    setCreating(false);
  }

  async function handleDelete(floorId: string) {
    if (!confirm("Delete this floor? Rooms on this floor will be unassigned.")) return;
    const res = await deleteFloor(floorId);
    if (res.error) toast.error("Could not delete", { description: res.error });
    else { toast.success("Floor deleted"); await fetchFloorsData(); }
  }

  if (!isSupabaseAuth) return <div className="mx-auto max-w-3xl"><PageHeader title="Floors" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href={`/landlord/properties/${params.id}`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to property</Link></Button>
      <PageHeader eyebrow="Floor management" title="Floors" description="Organize rooms by floor for easier management." />

      <Card>
        <CardHeader><CardTitle className="text-base">Add floor</CardTitle></CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="flex-1 space-y-1"><Label htmlFor="label">Label</Label><Input id="label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Ground floor" /></div>
          <div className="w-24 space-y-1"><Label htmlFor="level">Level</Label><Input id="level" type="number" min={0} value={newLevel} onChange={(e) => setNewLevel(e.target.value)} /></div>
          <Button onClick={handleCreate} disabled={creating}><Plus className="mr-2 h-4 w-4" /> Add</Button>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card>
      ) : floors.length === 0 ? (
        <EmptyState icon={<Layers className="h-5 w-5" />} title="No floors" description="Add floors to organize rooms by level." />
      ) : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {floors.map((f) => (
              <li key={f.id} className="flex items-center justify-between p-4">
                <div><p className="font-medium">{f.label}</p><p className="text-xs text-muted-foreground">Level {f.level}</p></div>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
