"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Building2, MapPin, Sparkles, Camera, ShieldCheck, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createProperty } from "@/lib/supabase/landlord-service";
import { fetchUniversities, fetchNeighbourhoods } from "@/lib/supabase/property-service";
import { FACILITY_LABELS } from "@/lib/types";
import type { Facility, PropertyType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PROPERTY_TYPES: { value: string; label: string }[] = [
  { value: "hostel_block", label: "Hostel block" },
  { value: "apartment_building", label: "Apartment building" },
  { value: "terrace_house", label: "Terrace house" },
  { value: "detached_house", label: "Detached house" },
  { value: "self_contain_block", label: "Self-contain block" },
  { value: "shared_house", label: "Shared house" },
];

const FACILITY_OPTIONS = Object.keys(FACILITY_LABELS) as Facility[];

const steps = [
  { id: 1, label: "Property details", icon: Building2 },
  { id: 2, label: "Location", icon: MapPin },
  { id: 3, label: "Facilities", icon: Sparkles },
  { id: 4, label: "Photos", icon: Camera },
  { id: 5, label: "Review", icon: Check },
];

export default function NewPropertyPage() {
  const router = useRouter();
  const { session } = useAuth();
  const isSupabaseAuth = session?.authenticated === true;
  const [step, setStep] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [universities, setUniversities] = React.useState<any[]>([]);
  const [neighbourhoods, setNeighbourhoods] = React.useState<any[]>([]);

  // Form state
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("hostel_block");
  const [description, setDescription] = React.useState("");
  const [city, setCity] = React.useState("Lagos");
  const [state, setState] = React.useState("Lagos");
  const [universityId, setUniversityId] = React.useState("");
  const [neighbourhoodId, setNeighbourhoodId] = React.useState("");
  const [publicAddress, setPublicAddress] = React.useState("");
  const [privateAddress, setPrivateAddress] = React.useState("");
  const [facilities, setFacilities] = React.useState<string[]>([]);
  const [rules, setRules] = React.useState<string[]>([]);

  React.useEffect(() => {
    fetchUniversities().then((res) => { if (res.data) setUniversities(res.data); });
  }, []);

  React.useEffect(() => {
    if (universityId) {
      fetchNeighbourhoods(universityId).then((res) => { if (res.data) setNeighbourhoods(res.data); });
    } else {
      setNeighbourhoods([]);
    }
  }, [universityId]);

  function toggleFacility(f: string) {
    setFacilities((arr) => arr.includes(f) ? arr.filter((x) => x !== f) : [...arr, f]);
  }

  async function handleSubmit() {
    if (!isSupabaseAuth) {
      toast.error("Sign in with a real account to create properties");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createProperty({
        name,
        description,
        type,
        city,
        state,
        universityId: universityId || undefined,
        neighbourhoodId: neighbourhoodId || undefined,
        publicAddressLine: publicAddress,
        privateAddressLine: privateAddress,
        facilities,
        rules: rules.map(r => ({ label: r, category: "other" })),
      });
      if (result.error) {
        toast.error("Failed to create property", { description: result.error });
      } else if (result.data) {
        toast.success("Property created", { description: "You can now add floors and rooms." });
        router.push(`/landlord/properties/${result.data.id}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="New property"
        title="List a property"
        description="A multi-step wizard to capture everything we need to verify your listing."
      />

      {!isSupabaseAuth && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-3 text-xs text-warning-foreground">
            Demo mode — sign in with a real landlord account to create properties.
          </CardContent>
        </Card>
      )}

      {/* Stepper */}
      <nav aria-label="Progress">
        <ol className="flex flex-wrap items-center gap-2">
          {steps.map((s, i) => {
            const active = step === s.id;
            const done = step > s.id;
            return (
              <li key={s.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => step > s.id && setStep(s.id)}
                  disabled={step <= s.id}
                  className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active ? "border-primary bg-primary text-primary-foreground" : done ? "border-success/30 bg-success/10 text-success" : "border-border bg-card text-muted-foreground")}
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/20 text-[10px]">
                    {done ? <Check className="h-3 w-3" aria-hidden /> : s.id}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step 1: Details */}
      {step === 1 && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Property name</Label>
                <Input id="name" placeholder="e.g. Akoka Heights Hostel" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Property type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={4} placeholder="Describe the property, its history, what makes it special…" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!name || !description}>Continue <ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Location */}
      {step === 2 && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="city">City</Label><Input id="city" value={city} onChange={(e) => setCity(e.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="state">State</Label><Input id="state" value={state} onChange={(e) => setState(e.target.value)} /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>University</Label>
                  <Select value={universityId} onValueChange={setUniversityId}>
                    <SelectTrigger><SelectValue placeholder="Select university" /></SelectTrigger>
                    <SelectContent>
                      {universities.map((u) => <SelectItem key={u.id} value={u.id}>{u.short_name} — {u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Neighbourhood</Label>
                  <Select value={neighbourhoodId} onValueChange={setNeighbourhoodId}>
                    <SelectTrigger><SelectValue placeholder="Select neighbourhood" /></SelectTrigger>
                    <SelectContent>
                      {neighbourhoods.map((n) => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="publicAddress">Public address (approximate)</Label>
                <Input id="publicAddress" placeholder="e.g. St. Finbarr's College Road, Akoka" value={publicAddress} onChange={(e) => setPublicAddress(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="privateAddress">Private address (exact)</Label>
                <Input id="privateAddress" placeholder="e.g. 14 St. Finbarr's College Road, Akoka, Yaba, Lagos" value={privateAddress} onChange={(e) => setPrivateAddress(e.target.value)} />
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back</Button>
                <Button onClick={() => setStep(3)} disabled={!city || !state || !publicAddress || !privateAddress}>Continue <ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Facilities */}
      {step === 3 && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label>Building-wide facilities</Label>
                <p className="text-xs text-muted-foreground">Tick all facilities available to every resident.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {FACILITY_OPTIONS.map((f) => {
                  const checked = facilities.includes(f);
                  return (
                    <label key={f} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors", checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40")}>
                      <Checkbox checked={checked} onCheckedChange={() => toggleFacility(f)} />
                      <span className="flex-1">{FACILITY_LABELS[f]}</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back</Button>
                <Button onClick={() => setStep(4)}>Continue <ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Photos */}
      {step === 4 && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label>Property photographs</Label>
                <p className="text-xs text-muted-foreground">Upload exterior, common areas, and at least one photo per typical room type.</p>
              </div>
              <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
                <Camera className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
                <p className="mt-2 text-sm font-medium">Photo uploads coming soon</p>
                <p className="text-xs text-muted-foreground">Supabase Storage bucket needs to be configured. You can add photos later.</p>
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(3)}><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back</Button>
                <Button onClick={() => setStep(5)}>Continue <ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Review */}
      {step === 5 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Review your listing</h2>
              <p className="text-sm text-muted-foreground">Check everything before submitting. Your property will be saved as a draft.</p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <div><dt className="text-xs uppercase text-muted-foreground">Name</dt><dd className="font-medium">{name || "—"}</dd></div>
              <div><dt className="text-xs uppercase text-muted-foreground">Type</dt><dd className="font-medium capitalize">{type.replace(/_/g, " ")}</dd></div>
              <div><dt className="text-xs uppercase text-muted-foreground">City/State</dt><dd className="font-medium">{city}, {state}</dd></div>
              <div><dt className="text-xs uppercase text-muted-foreground">Public address</dt><dd className="font-medium">{publicAddress || "—"}</dd></div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase text-muted-foreground">Facilities ({facilities.length})</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {facilities.map((f) => <Badge key={f} variant="secondary" className="text-xs">{FACILITY_LABELS[f as Facility]}</Badge>)}
                </dd>
              </div>
            </dl>
            <Separator />
            <Card className="border-warning/30 bg-warning/10">
              <CardContent className="p-3 text-xs text-warning-foreground">
                Your property will be saved as a <strong>draft</strong>. You'll need to add floors and rooms, then submit for verification before it goes live.
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(4)}><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back</Button>
              <Button onClick={handleSubmit} disabled={submitting || !isSupabaseAuth}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Creating…</> : <><Save className="mr-2 h-4 w-4" aria-hidden /> Create property</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
