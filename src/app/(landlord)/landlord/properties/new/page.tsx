"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Building2,
  MapPin,
  Sparkles,
  Camera,
  Upload,
  ShieldCheck,
  Save,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-components";
import {
  propertyStep1Schema,
  propertyStep2Schema,
  propertyStep3Schema,
  type PropertyStep1,
  type PropertyStep2,
  type PropertyStep3,
} from "@/lib/validators";
import { universities, neighbourhoods } from "@/lib/data/fixtures";
import { FACILITY_LABELS, type Facility, type PropertyType } from "@/lib/types";
import { ngnToKobo } from "@/lib/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, label: "Property details", icon: Building2 },
  { id: 2, label: "Location", icon: MapPin },
  { id: 3, label: "Facilities & rules", icon: Sparkles },
  { id: 4, label: "Photographs", icon: Camera },
  { id: 5, label: "Evidence", icon: ShieldCheck },
  { id: 6, label: "Review", icon: Check },
];

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: "hostel_block", label: "Hostel block" },
  { value: "apartment_building", label: "Apartment building" },
  { value: "terrace_house", label: "Terrace house" },
  { value: "detached_house", label: "Detached house" },
  { value: "self_contain_block", label: "Self-contain block" },
  { value: "shared_house", label: "Shared house" },
];

const facilityOptions = Object.keys(FACILITY_LABELS) as Facility[];

export default function NewPropertyPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [data, setData] = React.useState<Record<string, unknown>>({
    facilities: [],
    rules: [],
    images: [],
    evidence: [],
  });

  // Step 1 form
  const form1 = useForm<PropertyStep1>({
    resolver: zodResolver(propertyStep1Schema),
    defaultValues: { name: "", type: "hostel_block", description: "" },
  });
  // Step 2 form
  const form2 = useForm<PropertyStep2>({
    resolver: zodResolver(propertyStep2Schema),
    defaultValues: { city: "Lagos", state: "Lagos", publicAddressLine: "", privateAddressLine: "" },
  });
  // Step 3 form
  const form3 = useForm<PropertyStep3>({
    resolver: zodResolver(propertyStep3Schema),
    defaultValues: { facilities: [], rules: [] },
  });

  function next1(values: PropertyStep1) {
    setData((d) => ({ ...d, ...values }));
    setStep(2);
  }
  function next2(values: PropertyStep2) {
    setData((d) => ({ ...d, ...values }));
    setStep(3);
  }
  function next3(values: PropertyStep3) {
    setData((d) => ({ ...d, ...values }));
    setStep(4);
  }

  function saveDraft() {
    toast.success("Draft saved", {
      description: "You can resume this listing from your properties page.",
    });
  }

  async function submit() {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);
    toast.success("Property submitted for verification", {
      description: "We'll review your submission within 3–5 business days.",
    });
    router.push("/landlord/properties");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="New property"
        title="List a property"
        description="A multi-step wizard to capture everything we need to verify your listing."
        actions={
          <Button variant="outline" size="sm" onClick={saveDraft}>
            <Save className="mr-2 h-4 w-4" aria-hidden />
            Save draft
          </Button>
        }
      />

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
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : done
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-border bg-card text-muted-foreground",
                  )}
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/20 text-[10px]">
                    {done ? <Check className="h-3 w-3" aria-hidden /> : s.id}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < steps.length - 1 && <ArrowRight className="hidden h-3 w-3 text-muted-foreground sm:inline" aria-hidden />}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step 1: Property details */}
      {step === 1 && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={form1.handleSubmit(next1)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name">Property name</Label>
                <Input id="name" placeholder="e.g. Akoka Heights Hostel" {...form1.register("name")} />
                {form1.formState.errors.name && <p className="text-xs text-destructive">{form1.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type">Property type</Label>
                <Select
                  value={form1.watch("type")}
                  onValueChange={(v) => form1.setValue("type", v as PropertyType)}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={5}
                  placeholder="Describe the property, its history, what makes it special, and the kind of student it suits."
                  {...form1.register("description")}
                />
                {form1.formState.errors.description && <p className="text-xs text-destructive">{form1.formState.errors.description.message}</p>}
              </div>
              <div className="flex justify-end">
                <Button type="submit">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Location */}
      {step === 2 && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={form2.handleSubmit(next2)} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...form2.register("city")} />
                  {form2.formState.errors.city && <p className="text-xs text-destructive">{form2.formState.errors.city.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" {...form2.register("state")} />
                  {form2.formState.errors.state && <p className="text-xs text-destructive">{form2.formState.errors.state.message}</p>}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>University</Label>
                  <Select
                    value={form2.watch("universityId")}
                    onValueChange={(v) => form2.setValue("universityId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select university" />
                    </SelectTrigger>
                    <SelectContent>
                      {universities.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.shortName} — {u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form2.formState.errors.universityId && <p className="text-xs text-destructive">{form2.formState.errors.universityId.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Neighbourhood</Label>
                  <Select
                    value={form2.watch("neighbourhoodId")}
                    onValueChange={(v) => form2.setValue("neighbourhoodId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select neighbourhood" />
                    </SelectTrigger>
                    <SelectContent>
                      {neighbourhoods.map((n) => (
                        <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form2.formState.errors.neighbourhoodId && <p className="text-xs text-destructive">{form2.formState.errors.neighbourhoodId.message}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="publicAddressLine">Public address (approximate)</Label>
                <Input
                  id="publicAddressLine"
                  placeholder="e.g. St. Finbarr's College Road, Akoka"
                  {...form2.register("publicAddressLine")}
                />
                <p className="text-xs text-muted-foreground">Shown publicly — street name and area only.</p>
                {form2.formState.errors.publicAddressLine && <p className="text-xs text-destructive">{form2.formState.errors.publicAddressLine.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="privateAddressLine">Private address (exact)</Label>
                <Input
                  id="privateAddressLine"
                  placeholder="e.g. 14 St. Finbarr's College Road, Akoka, Yaba, Lagos"
                  {...form2.register("privateAddressLine")}
                />
                <p className="text-xs text-muted-foreground">Shown only to students with confirmed bookings.</p>
                {form2.formState.errors.privateAddressLine && <p className="text-xs text-destructive">{form2.formState.errors.privateAddressLine.message}</p>}
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back
                </Button>
                <Button type="submit">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Facilities & rules */}
      {step === 3 && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={form3.handleSubmit(next3)} className="space-y-5">
              <div className="space-y-2">
                <Label>Building-wide facilities</Label>
                <p className="text-xs text-muted-foreground">Tick all facilities available to every resident.</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {facilityOptions.map((f) => {
                    const checked = (form3.watch("facilities") as string[]).includes(f);
                    return (
                      <label key={f} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors", checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40")}>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const cur = form3.getValues("facilities") as string[];
                            form3.setValue("facilities", v ? [...cur, f] : cur.filter((x) => x !== f), { shouldValidate: true });
                          }}
                        />
                        <span className="flex-1">{FACILITY_LABELS[f]}</span>
                      </label>
                    );
                  })}
                </div>
                {form3.formState.errors.facilities && <p className="text-xs text-destructive">{form3.formState.errors.facilities.message}</p>}
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>House rules (optional)</Label>
                <p className="text-xs text-muted-foreground">Add one rule per line. We'll group them by category automatically.</p>
                <Textarea
                  rows={4}
                  placeholder={"No loud music after 10pm\nVisitors allowed 9am–8pm only\nNo smoking indoors"}
                  onChange={(e) => {
                    const rules = e.target.value.split("\n").filter(Boolean);
                    form3.setValue("rules", rules);
                  }}
                />
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back
                </Button>
                <Button type="submit">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Photographs */}
      {step === 4 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Property photographs</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload exterior, common areas, and at least one photo per typical room type. Mark
                representative images clearly.
              </p>
            </div>
            <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="mt-2 text-sm font-medium">Drop photos here or click to browse</p>
              <p className="text-xs text-muted-foreground">PNG, JPG or WebP — max 8MB each, 30 photos total</p>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => toast.info("Demo upload", { description: "Production: uploads go to Cloudinary with verified badge." })}>
                Choose files
              </Button>
            </div>
            <Card className="border-dashed bg-muted/30">
              <CardContent className="p-3 text-xs text-muted-foreground">
                <strong className="text-foreground">Demo mode:</strong> Photo uploads use Cloudinary
                in production. The signed upload URL is generated by a server action; the browser
                never sees Cloudinary credentials.
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back
              </Button>
              <Button type="button" onClick={() => setStep(5)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Evidence */}
      {step === 5 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Ownership or management authority</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload documents proving you own or are authorised to manage this property. We review
                every submission; on-site inspections may be scheduled.
              </p>
            </div>
            <ul className="space-y-2">
              {[
                { name: "Certificate of occupancy / deed of assignment", required: true },
                { name: "Utility bill (within 90 days)", required: true },
                { name: "Government-issued ID", required: true },
                { name: "Management contract (if applicable)", required: false },
              ].map((doc) => (
                <li key={doc.name} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                    <span className="text-sm">{doc.name}</span>
                    {doc.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => toast.info("Demo upload", { description: "Production: document uploads are encrypted at rest." })}>
                    <Upload className="mr-2 h-3.5 w-3.5" aria-hidden />
                    Upload
                  </Button>
                </li>
              ))}
            </ul>
            <Card className="border-dashed bg-muted/30">
              <CardContent className="p-3 text-xs text-muted-foreground">
                <strong className="text-foreground">Verification:</strong> NetLodge never approves
                self-submitted verification. Documents are reviewed by our team and an on-site
                inspection is scheduled before the verified badge is granted.
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep(4)}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back
              </Button>
              <Button type="button" onClick={() => setStep(6)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Review */}
      {step === 6 && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <h2 className="font-display text-lg font-semibold">Review your listing</h2>
              <p className="text-sm text-muted-foreground">Check everything below before submitting for verification.</p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Property name</dt>
                <dd className="font-medium">{(data as PropertyStep1).name || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Type</dt>
                <dd className="font-medium capitalize">{(data as PropertyStep1).type?.replace(/_/g, " ") || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">City / State</dt>
                <dd className="font-medium">{(data as PropertyStep2).city}, {(data as PropertyStep2).state}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Public address</dt>
                <dd className="font-medium">{(data as PropertyStep2).publicAddressLine || "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Facilities ({(data as PropertyStep3).facilities?.length || 0})</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {((data as PropertyStep3).facilities as Facility[] | undefined)?.map((f) => (
                    <Badge key={f} variant="secondary" className="text-xs">{FACILITY_LABELS[f]}</Badge>
                  ))}
                </dd>
              </div>
            </dl>
            <Separator />
            <Card className="border-warning/30 bg-warning/10">
              <CardContent className="p-3 text-xs text-warning-foreground">
                By submitting, you confirm the information is accurate and that you have the legal
                authority to list this property. False submissions result in immediate account
                suspension and forfeiture of pending payouts.
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep(5)}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back
              </Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Submitting…
                  </>
                ) : (
                  <>
                    Submit for verification
                    <Check className="ml-2 h-4 w-4" aria-hidden />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
