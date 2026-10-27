"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Layers,
  Plus,
  Edit2,
  Trash2,
  DoorOpen,
  Grid3x3,
  List,
  Loader2,
  Save,
  X,
} from "lucide-react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { RoomStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { properties as allProperties, floors as allFloors } from "@/lib/data/fixtures";
import { getRepositories } from "@/lib/repositories";
import type { Floor } from "@/lib/types";
import { floorSchema } from "@/lib/validators";
import { ngnToKobo, koboToNgn, formatNgn } from "@/lib/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export default function LandlordFloorsPage() {
  const params = useParams<{ id: string }>();
  const property = allProperties.find((p) => p.id === params.id);
  const [floors, setFloors] = React.useState<Floor[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Floor | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<{
    label: string;
    level: number;
    defaultPriceNgn: string;
    description: string;
  }>({
    resolver: zodResolver(floorSchema.omit({ defaultPriceKobo: true }).extend({
      defaultPriceNgn: z.string().optional(),
      description: z.string().optional(),
    })) as never,
    defaultValues: { label: "", level: 0, defaultPriceNgn: "", description: "" },
  });

  React.useEffect(() => {
    if (!property) return;
    getRepositories()
      .floors.listByProperty(property.id)
      .then((f) => {
        setFloors(f.sort((a, b) => a.level - b.level));
        setLoading(false);
      });
  }, [property]);

  if (!property) {
    return <div className="mx-auto max-w-5xl"><p className="text-sm text-muted-foreground">Property not found.</p></div>;
  }

  function openCreate() {
    setEditing(null);
    reset({ label: "", level: floors.length, defaultPriceNgn: "", description: "" });
    setOpen(true);
  }

  function openEdit(floor: Floor) {
    setEditing(floor);
    reset({
      label: floor.label,
      level: floor.level,
      defaultPriceNgn: floor.defaultPriceKobo ? String(koboToNgn(floor.defaultPriceKobo)) : "",
      description: floor.description ?? "",
    });
    setOpen(true);
  }

  async function onSubmit(values: { label: string; level: number; defaultPriceNgn: string; description: string }) {
    const payload = {
      label: values.label,
      level: Number(values.level),
      defaultPriceKobo: values.defaultPriceNgn ? ngnToKobo(Number(values.defaultPriceNgn)) : undefined,
      description: values.description || undefined,
      propertyId: property!.id,
      position: editing?.position ?? floors.length,
    };
    if (editing) {
      const updated = await getRepositories().floors.update(editing.id, payload);
      setFloors((arr) => arr.map((f) => (f.id === editing.id ? updated : f)));
      toast.success("Floor updated");
    } else {
      const created = await getRepositories().floors.create(payload as never);
      setFloors((arr) => [...arr, created].sort((a, b) => a.level - b.level));
      toast.success("Floor created", { description: `Added ${created.label}` });
    }
    setOpen(false);
  }

  async function remove(floor: Floor) {
    if (!confirm(`Delete ${floor.label}? Rooms on this floor will be unassigned.`)) return;
    await getRepositories().floors.delete(floor.id);
    setFloors((arr) => arr.filter((f) => f.id !== floor.id));
    toast.success("Floor deleted");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/landlord/properties/${property.id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          Back to {property.name}
        </Link>
      </Button>

      <PageHeader
        eyebrow="Inventory"
        title="Manage floors"
        description="Organise your property floor-by-floor. Apply default prices per floor and override individual room prices separately."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Add floor
          </Button>
        }
      />

      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Tip:</strong> A two-bedroom apartment rented as one
          unit should be represented as a single rentable unit on a floor — not as two independently
          bookable rooms. Use the <Link href={`/landlord/properties/${property.id}/rooms`} className="text-primary hover:underline">Rooms</Link> tab to define unit types.
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : floors.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-5 w-5" aria-hidden />}
          title="No floors yet"
          description="Add your first floor to start creating rooms."
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Add floor
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {floors.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Layers className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <p className="font-medium">{f.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Level {f.level} · {f.totalUnits} units · {f.availableUnits} available
                        {f.defaultPriceKobo && ` · ${formatNgn(f.defaultPriceKobo)}/yr default`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/landlord/properties/${property.id}/rooms?floor=${f.id}`}>
                        <DoorOpen className="mr-1 h-3.5 w-3.5" aria-hidden />
                        Rooms
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(f)} aria-label="Edit floor">
                      <Edit2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(f)}
                      aria-label="Delete floor"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit floor" : "Add a floor"}</DialogTitle>
            <DialogDescription>
              Set the floor label and an optional default price. Rooms inherit this price unless individually overridden.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="label">Floor label</Label>
                <Input id="label" placeholder="e.g. Ground Floor" {...register("label")} />
                {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="level">Level</Label>
                <Input id="level" type="number" min={-3} max={50} {...register("level")} />
                {errors.level && <p className="text-xs text-destructive">{errors.level.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="defaultPriceNgn">Default annual rent (NGN, optional)</Label>
              <Input id="defaultPriceNgn" type="number" min={0} step={50000} placeholder="e.g. 450000" {...register("defaultPriceNgn")} />
              <p className="text-xs text-muted-foreground">Applied to all rooms on this floor unless overridden.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Input id="description" placeholder="e.g. Quiet floor, near the staircase" {...register("description")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Saving…</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" aria-hidden /> {editing ? "Save changes" : "Add floor"}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
