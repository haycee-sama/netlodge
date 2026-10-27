"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Building } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { landlordProfileSchema, type LandlordProfileInput } from "@/lib/validators";
import { initials } from "@/lib/utils/format";
import { toast } from "sonner";

export default function LandlordProfilePage() {
  const { session } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LandlordProfileInput>({
    resolver: zodResolver(landlordProfileSchema),
    defaultValues: {
      displayName: session ? `${session.firstName} ${session.lastName}` : "",
      businessName: "Akoka Heights Ltd.",
      officeAddress: "14 St. Finbarr's College Road, Akoka, Lagos",
    },
  });

  async function onSubmit(_values: LandlordProfileInput) {
    await new Promise((r) => setTimeout(r, 500));
    toast.success("Profile saved");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Profile" title="Landlord profile" description="Your public profile visible to students when they view your listings." />

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {initials(session?.firstName, session?.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="font-display text-lg font-semibold">{session?.firstName} {session?.lastName}</p>
            <p className="text-sm text-muted-foreground">{session?.email}</p>
            <Badge variant="outline">Landlord</Badge>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building className="h-4 w-4 text-primary" aria-hidden />Business details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" {...register("displayName")} />
              {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="businessName">Business name (optional)</Label>
              <Input id="businessName" {...register("businessName")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="officeAddress">Office address (optional)</Label>
              <Input id="officeAddress" {...register("officeAddress")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rcNumber">RC number (optional)</Label>
              <Input id="rcNumber" placeholder="e.g. RC 1234567" {...register("rcNumber")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Saving…</> : <><Save className="mr-2 h-4 w-4" aria-hidden /> Save profile</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
