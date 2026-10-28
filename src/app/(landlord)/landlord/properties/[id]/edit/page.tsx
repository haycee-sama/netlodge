"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { fetchLandlordProperty, updateProperty } from "@/lib/supabase/landlord-service";
import { fetchUniversities, fetchNeighbourhoods } from "@/lib/supabase/property-service";
import { toast } from "sonner";
import { invalidateCache, CACHE_TAGS } from "@/lib/cache/invalidate-client";

const PROPERTY_TYPES = [
  { value: "hostel_block", label: "Hostel block" },
  { value: "apartment_building", label: "Apartment building" },
  { value: "terrace_house", label: "Terrace house" },
  { value: "detached_house", label: "Detached house" },
  { value: "self_contain_block", label: "Self-contain block" },
  { value: "shared_house", label: "Shared house" },
];

export default function EditPropertyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const isSupabaseAuth = session?.authenticated === true;

  const [property, setProperty] = React.useState<any>(null);
  const [universities, setUniversities] = React.useState<any[]>([]);
  const [neighbourhoods, setNeighbourhoods] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState("hostel_block");
  const [city, setCity] = React.useState("Lagos");
  const [state, setState] = React.useState("Lagos");
  const [universityId, setUniversityId] = React.useState("");
  const [neighbourhoodId, setNeighbourhoodId] = React.useState("");
  const [publicAddress, setPublicAddress] = React.useState("");
  const [privateAddress, setPrivateAddress] = React.useState("");

  React.useEffect(() => {
    if (!isSupabaseAuth || !params.id) { setLoading(false); return; }
    Promise.all([
      fetchLandlordProperty(params.id),
      fetchUniversities(),
    ]).then(async ([propRes, uniRes]) => {
      if (propRes.error || !propRes.data) {
        setError(propRes.error ?? "Property not found");
        setLoading(false);
        return;
      }
      const p = propRes.data;
      setProperty(p);
      setName(p.name ?? "");
      setDescription(p.description ?? "");
      setType(p.type ?? "hostel_block");
      setCity(p.city ?? "Lagos");
      setState(p.state ?? "Lagos");
      setUniversityId(p.university_id ?? "");
      setNeighbourhoodId(p.neighbourhood_id ?? "");
      setPublicAddress(p.public_address_line ?? "");
      setPrivateAddress(p.private_address_line ?? "");

      if (uniRes.data) setUniversities(uniRes.data);
      if (p.university_id) {
        const nRes = await fetchNeighbourhoods(p.university_id);
        if (nRes.data) setNeighbourhoods(nRes.data);
      }
      setLoading(false);
    });
  }, [isSupabaseAuth, params.id]);

  React.useEffect(() => {
    if (universityId) {
      fetchNeighbourhoods(universityId).then((res) => {
        if (res.data) setNeighbourhoods(res.data);
      });
    } else {
      setNeighbourhoods([]);
      setNeighbourhoodId("");
    }
  }, [universityId]);

  async function handleSave() {
    if (!property) return;
    if (name.trim().length < 3) { toast.error("Property name must be at least 3 characters"); return; }
    if (!publicAddress.trim()) { toast.error("Public address is required"); return; }
    if (!privateAddress.trim()) { toast.error("Private address is required"); return; }

    setSaving(true);
    const result = await updateProperty(property.id, {
      name: name.trim(),
      description: description.trim(),
      type,
      city: city.trim(),
      state: state.trim(),
      universityId: universityId || undefined,
      neighbourhoodId: neighbourhoodId || undefined,
      publicAddressLine: publicAddress.trim(),
      privateAddressLine: privateAddress.trim(),
    });

    if (result.error) {
      toast.error("Failed to save", { description: result.error });
    } else {
      toast.success("Property updated");
      await invalidateCache([CACHE_TAGS.PROPERTIES, CACHE_TAGS.UNITS]);
      router.push(`/landlord/properties/${property.id}`);
    }
    setSaving(false);
  }

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader eyebrow="Properties" title="Edit property" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in to edit properties.</CardContent></Card>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (error || !property) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Button asChild variant="ghost" size="sm"><Link href="/landlord/properties"><ArrowLeft className="mr-2 h-4 w-4" /> Back to properties</Link></Button>
        <Card><CardContent className="p-6 text-center text-sm text-destructive">{error ?? "Property not found"}</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href={`/landlord/properties/${property.id}`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to property</Link></Button>

      <PageHeader eyebrow="Edit property" title={property.name} description="Update property details. Changes are visible immediately." />

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" /> Property details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Property name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Akoka Heights Hostel" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe the property..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="type">Property type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="university">University</Label>
              <Select value={universityId} onValueChange={setUniversityId}>
                <SelectTrigger id="university"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {universities.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.short_name} — {u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {neighbourhoods.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="neighbourhood">Neighbourhood</Label>
              <Select value={neighbourhoodId} onValueChange={setNeighbourhoodId}>
                <SelectTrigger id="neighbourhood"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {neighbourhoods.map((n: any) => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="publicAddress">Public address (approximate)</Label>
            <Input id="publicAddress" value={publicAddress} onChange={(e) => setPublicAddress(e.target.value)} placeholder="e.g. Akoka Road, Yaba" />
            <p className="text-xs text-muted-foreground">Shown publicly on the listing. Do not include exact house numbers.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="privateAddress">Private address (exact)</Label>
            <Input id="privateAddress" value={privateAddress} onChange={(e) => setPrivateAddress(e.target.value)} placeholder="e.g. 12 Akoka Road, Yaba, Lagos" />
            <p className="text-xs text-muted-foreground">Shared with students only after a booking is confirmed.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" asChild><Link href={`/landlord/properties/${property.id}`}>Cancel</Link></Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : <><Save className="mr-2 h-4 w-4" /> Save changes</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
