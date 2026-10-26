"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  DoorOpen,
  Plus,
  Grid3x3,
  List as ListIcon,
  Search,
  Loader2,
  Edit2,
  Trash2,
  CheckSquare,
  Square,
  Tag,
  Layers,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { RoomStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { properties as allProperties } from "@/lib/data/fixtures";
import { getRepositories } from "@/lib/repositories";
import type { Floor, RentableUnit, RentableUnitType } from "@/lib/types";
import { UNIT_TYPE_LABELS, RENTAL_PERIOD_LABELS } from "@/lib/types";
import { ngnToKobo, koboToNgn, formatNgn } from "@/lib/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LandlordRoomsPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const property = allProperties.find((p) => p.id === params.id);
  const [floors, setFloors] = React.useState<Floor[]>([]);
  const [rooms, setRooms] = React.useState<RentableUnit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState<"table" | "grid">("table");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [floorFilter, setFloorFilter] = React.useState<string>(searchParams.get("floor") ?? "all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [q, setQ] = React.useState("");
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [priceOverrideOpen, setPriceOverrideOpen] = React.useState(false);
  const [overridePriceNgn, setOverridePriceNgn] = React.useState("");

  React.useEffect(() => {
    if (!property) return;
    Promise.all([
      getRepositories().floors.listByProperty(property.id),
      getRepositories().rooms.listByProperty(property.id),
    ]).then(([f, r]) => {
      setFloors(f.sort((a, b) => a.level - b.level));
      setRooms(r);
      setLoading(false);
    });
  }, [property]);

  if (!property) {
    return <div className="mx-auto max-w-5xl"><p className="text-sm text-muted-foreground">Property not found.</p></div>;
  }

  const floorMap = new Map(floors.map((f) => [f.id, f]));
  const filtered = rooms.filter((r) => {
    if (floorFilter !== "all" && r.floorId !== floorFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (q && !r.identifier.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map((r) => r.id)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  async function applyPriceOverride() {
    if (selected.size === 0) {
      toast.error("Select at least one room first");
      return;
    }
    if (!overridePriceNgn) {
      toast.error("Enter a new price");
      return;
    }
    const kobo = ngnToKobo(Number(overridePriceNgn));
    const count = await getRepositories().rooms.bulkUpdatePrices({
      roomIds: Array.from(selected),
      annualRentKobo: kobo,
    });
    setRooms((arr) => arr.map((r) => (selected.has(r.id) ? { ...r, annualRentKobo: kobo } : r)));
    toast.success(`Updated ${count} rooms`, { description: `New annual rent: ${formatNgn(kobo)}` });
    setPriceOverrideOpen(false);
    setOverridePriceNgn("");
    setSelected(new Set());
  }

  async function deleteRoom(room: RentableUnit) {
    if (!confirm(`Delete unit ${room.identifier}? This cannot be undone.`)) return;
    await getRepositories().rooms.delete(room.id);
    setRooms((arr) => arr.filter((r) => r.id !== room.id));
    toast.success("Room deleted");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/landlord/properties/${property.id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          Back to {property.name}
        </Link>
      </Button>

      <PageHeader
        eyebrow="Inventory"
        title="Manage rooms"
        description={`${rooms.length} units across ${floors.length} floors. Bulk-create, bulk-edit, override prices.`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/landlord/rooms/new">
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                Single room
              </Link>
            </Button>
            <Button onClick={() => setBulkOpen(true)}>
              <Layers className="mr-2 h-4 w-4" aria-hidden />
              Bulk create
            </Button>
          </div>
        }
      />

      {/* Filters & view toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              placeholder="Search by identifier…"
              className="h-9 w-44 pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={floorFilter} onValueChange={setFloorFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All floors</SelectItem>
              {floors.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="held">On hold</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="off_market">Off market</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Dialog open={priceOverrideOpen} onOpenChange={setPriceOverrideOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Tag className="mr-2 h-3.5 w-3.5" aria-hidden />
                  Override price ({selected.size})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Override annual rent for {selected.size} rooms</DialogTitle>
                  <DialogDescription>
                    The new price will be applied to every selected room. Floor default prices remain unchanged.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5">
                  <Label htmlFor="overridePrice">New annual rent (NGN)</Label>
                  <Input
                    id="overridePrice"
                    type="number"
                    min={0}
                    step={50000}
                    placeholder="e.g. 500000"
                    value={overridePriceNgn}
                    onChange={(e) => setOverridePriceNgn(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPriceOverrideOpen(false)}>Cancel</Button>
                  <Button onClick={applyPriceOverride}>Apply to {selected.size} rooms</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <div className="flex rounded-lg border border-border p-0.5">
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-8"
              onClick={() => setView("table")}
            >
              <ListIcon className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Table view</span>
            </Button>
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-8"
              onClick={() => setView("grid")}
            >
              <Grid3x3 className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Grid view</span>
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<DoorOpen className="h-5 w-5" aria-hidden />}
          title="No rooms yet"
          description="Add a room or use bulk-create to add many at once."
          action={
            <Button onClick={() => setBulkOpen(true)}>
              <Layers className="mr-2 h-4 w-4" aria-hidden />
              Bulk create rooms
            </Button>
          }
        />
      ) : view === "table" ? (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs text-muted-foreground">
              <span>
                {selected.size > 0 ? `${selected.size} selected` : "Tap rows to select"}
              </span>
              <div className="flex gap-2">
                <button onClick={selectAll} className="hover:text-foreground hover:underline">Select all</button>
                <span>·</span>
                <button onClick={selectNone} className="hover:text-foreground hover:underline">Clear</button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Identifier</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Annual rent</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} data-state={selected.has(r.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={() => toggleSelect(r.id)}
                        aria-label={`Select ${r.identifier}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/landlord/rooms/${r.id}`} className="hover:text-primary hover:underline">
                        {r.identifier}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{floorMap.get(r.floorId)?.label ?? "—"}</TableCell>
                    <TableCell className="text-sm">{UNIT_TYPE_LABELS[r.unitType]}</TableCell>
                    <TableCell className="text-sm">{r.capacity}</TableCell>
                    <TableCell><RoomStatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatNgn(r.annualRentKobo)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button asChild variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit room">
                          <Link href={`/landlord/rooms/${r.id}/edit`}>
                            <Edit2 className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteRoom(r)}
                          aria-label="Delete room"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Grid view */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((r) => (
            <Card
              key={r.id}
              className={cn("cursor-pointer transition-all", selected.has(r.id) && "ring-2 ring-primary")}
              onClick={() => toggleSelect(r.id)}
            >
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{r.identifier}</p>
                    <p className="text-xs text-muted-foreground">{floorMap.get(r.floorId)?.label}</p>
                  </div>
                  <RoomStatusBadge status={r.status} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {UNIT_TYPE_LABELS[r.unitType]} · sleeps {r.capacity}
                </div>
                <Price kobo={r.annualRentKobo} period="/yr" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-start gap-2 p-3 text-xs text-muted-foreground">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            <strong className="text-foreground">Bulk operations:</strong> Select multiple rooms to
            override their annual rent in one action. Floor default prices remain unchanged — only
            the rooms you explicitly select are affected.
          </span>
        </CardContent>
      </Card>

      <BulkCreateDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        floors={floors}
        onCreated={(created) => {
          setRooms((arr) => [...arr, ...created]);
        }}
      />
    </div>
  );
}

/* ----------------------------------------------------------- Bulk create */

function BulkCreateDialog({
  open,
  onOpenChange,
  floors,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  floors: Floor[];
  onCreated: (rooms: RentableUnit[]) => void;
}) {
  const [floorId, setFloorId] = React.useState("");
  const [prefix, setPrefix] = React.useState("G");
  const [startIndex, setStartIndex] = React.useState("101");
  const [count, setCount] = React.useState("10");
  const [unitType, setUnitType] = React.useState<RentableUnitType>("self_contain");
  const [capacity, setCapacity] = React.useState("1");
  const [bedrooms, setBedrooms] = React.useState("1");
  const [bathrooms, setBathrooms] = React.useState("1");
  const [furnishing, setFurnishing] = React.useState<"unfurnished" | "semi_furnished" | "fully_furnished">("semi_furnished");
  const [annualRentNgn, setAnnualRentNgn] = React.useState("");
  const [rentalPeriod, setRentalPeriod] = React.useState<"annual" | "biannual" | "quarterly" | "monthly">("annual");
  const [applyFloorDefault, setApplyFloorDefault] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  async function submit() {
    if (!floorId) {
      toast.error("Select a floor");
      return;
    }
    if (Number(count) < 1 || Number(count) > 200) {
      toast.error("Count must be between 1 and 200");
      return;
    }
    setSubmitting(true);
    try {
      const annualRentKobo = applyFloorDefault
        ? (floors.find((f) => f.id === floorId)?.defaultPriceKobo ?? 0)
        : ngnToKobo(Number(annualRentNgn));
      if (!applyFloorDefault && annualRentKobo <= 0) {
        toast.error("Enter an annual rent or apply floor default");
        setSubmitting(false);
        return;
      }
      const created = await getRepositories().rooms.bulkCreate({
        floorId,
        prefix,
        startIndex: Number(startIndex),
        count: Number(count),
        base: {
          propertyId: floors.find((f) => f.id === floorId)?.propertyId ?? "",
          unitType,
          status: "available",
          capacity: Number(capacity),
          bedrooms: Number(bedrooms),
          bathrooms: Number(bathrooms),
          hasBalcony: false,
          hasWindow: true,
          facilities: [],
          furnishing,
          images: [],
          representativeImagesOnly: false,
          annualRentKobo,
          rentalPeriod,
          additionalCharges: [],
          bookingTerms: "Annual lease renewable.",
        },
      });
      onCreated(created);
      toast.success(`Created ${created.length} rooms`, {
        description: `${prefix}-${startIndex} to ${prefix}-${String(Number(startIndex) + Number(count) - 1).padStart(3, "0")}`,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk create rooms</DialogTitle>
          <DialogDescription>
            Generate up to 200 rooms in a single action. Identifiers are formed as <code>{`{prefix}-{index}`}</code>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Floor</Label>
            <Select value={floorId} onValueChange={setFloorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a floor" />
              </SelectTrigger>
              <SelectContent>
                {floors.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prefix">Identifier prefix</Label>
            <Input id="prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="e.g. G" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="startIndex">Start index</Label>
            <Input id="startIndex" type="number" min={0} value={startIndex} onChange={(e) => setStartIndex(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="count">Count (1–200)</Label>
            <Input id="count" type="number" min={1} max={200} value={count} onChange={(e) => setCount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Unit type</Label>
            <Select value={unitType} onValueChange={(v) => setUnitType(v as RentableUnitType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(UNIT_TYPE_LABELS) as RentableUnitType[]).map((t) => (
                  <SelectItem key={t} value={t}>{UNIT_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capacity">Capacity</Label>
            <Input id="capacity" type="number" min={1} max={20} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bedrooms">Bedrooms</Label>
            <Input id="bedrooms" type="number" min={0} max={20} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bathrooms">Bathrooms</Label>
            <Input id="bathrooms" type="number" min={0} max={20} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Furnishing</Label>
            <Select value={furnishing} onValueChange={(v) => setFurnishing(v as typeof furnishing)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unfurnished">Unfurnished</SelectItem>
                <SelectItem value="semi_furnished">Semi-furnished</SelectItem>
                <SelectItem value="fully_furnished">Fully furnished</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Rental period</Label>
            <Select value={rentalPeriod} onValueChange={(v) => setRentalPeriod(v as typeof rentalPeriod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RENTAL_PERIOD_LABELS) as Array<keyof typeof RENTAL_PERIOD_LABELS>).map((p) => (
                  <SelectItem key={p} value={p}>{RENTAL_PERIOD_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="annualRent">Annual rent (NGN)</Label>
            <Input
              id="annualRent"
              type="number"
              min={0}
              step={50000}
              placeholder="e.g. 450000"
              value={annualRentNgn}
              onChange={(e) => setAnnualRentNgn(e.target.value)}
              disabled={applyFloorDefault}
            />
            <label className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
              <Checkbox checked={applyFloorDefault} onCheckedChange={(v) => setApplyFloorDefault(v === true)} />
              Use floor default price
            </label>
          </div>
        </div>
        <Card className="border-dashed bg-muted/30">
          <CardContent className="p-3 text-xs text-muted-foreground">
            Preview: <strong className="text-foreground">{prefix}-{startIndex}</strong>, <strong className="text-foreground">{prefix}-{Number(startIndex) + 1}</strong>, …, <strong className="text-foreground">{prefix}-{Number(startIndex) + Number(count) - 1}</strong> ({count} rooms)
          </CardContent>
        </Card>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Creating…</>
            ) : (
              <>Create {count} rooms</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
