"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-components";
import { properties as allProperties } from "@/lib/data/fixtures";
import { toast } from "sonner";

export default function EditPropertyPage() {
  const params = useParams<{ id: string }>();
  const property = allProperties.find((p) => p.id === params.id);
  const [name, setName] = React.useState(property?.name ?? "");
  const [description, setDescription] = React.useState(property?.description ?? "");
  const [publicAddress, setPublicAddress] = React.useState(property?.publicAddressLine ?? "");
  const [submitting, setSubmitting] = React.useState(false);

  if (!property) {
    return <div className="mx-auto max-w-3xl"><p className="text-sm text-muted-foreground">Property not found.</p></div>;
  }

  async function submit() {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    toast.success("Property updated");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/landlord/properties/${property.id}`}><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to property</Link>
      </Button>

      <PageHeader eyebrow="Edit" title={property.name} description="Update property details. Changes to verified properties require re-verification." />

      <Card>
        <CardHeader><CardTitle className="text-base">Property details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="name">Property name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="publicAddress">Public address</Label><Input id="publicAddress" value={publicAddress} onChange={(e) => setPublicAddress(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="description">Description</Label><Textarea id="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline"><Link href={`/landlord/properties/${property.id}`}>Cancel</Link></Button>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Saving…</> : <><Save className="mr-2 h-4 w-4" aria-hidden /> Save changes</>}
        </Button>
      </div>
    </div>
  );
}
