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
import { useI18n } from "@/lib/i18n/context";
import { landlordProfileSchema, type LandlordProfileInput } from "@/lib/validators";
import { initials } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function LandlordProfilePage() {
  const { session } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = React.useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LandlordProfileInput>({
    resolver: zodResolver(landlordProfileSchema),
    defaultValues: {
      displayName: "",
      businessName: "",
      officeAddress: "",
      rcNumber: "",
    },
  });

  // Load existing landlord profile from the database.
  React.useEffect(() => {
    if (!session?.userId) { setLoading(false); return; }
    const supabase = createClient();
    supabase
      .from("landlord_profiles")
      .select("display_name, business_name, office_address, rc_number")
      .eq("user_id", session.userId)
      .single()
      .then(({ data, error }) => {
        if (error && error.code !== "PGRST116") {
          // PGRST116 = no row found yet — not an error, just empty.
          toast.error(t("common.profile.couldNotLoad"), { description: error.message });
        }
        if (data) {
          reset({
            displayName: data.display_name ?? "",
            businessName: data.business_name ?? "",
            officeAddress: data.office_address ?? "",
            rcNumber: data.rc_number ?? "",
          });
        } else {
          // No profile row yet — prefill display name from auth session.
          reset({
            displayName: `${session.firstName} ${session.lastName}`.trim(),
            businessName: "",
            officeAddress: "",
            rcNumber: "",
          });
        }
        setLoading(false);
      });
  }, [session?.userId, reset]);

  async function onSubmit(values: LandlordProfileInput) {
    if (!session?.userId) return;
    const supabase = createClient();
    const { error } = await supabase.from("landlord_profiles").upsert({
      user_id: session.userId,
      display_name: values.displayName,
      business_name: values.businessName || null,
      office_address: values.officeAddress || null,
      rc_number: values.rcNumber || null,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      toast.error(t("common.profile.couldNotSave"), { description: error.message });
    } else {
      toast.success(t("common.profile.saved"));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow={t("common.profile.eyebrow")} title={t("landlord.profile.title")} description={t("landlord.profile.description")} />

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
            <Badge variant="outline">{t("landlord.profile.landlordBadge")}</Badge>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building className="h-4 w-4 text-primary" aria-hidden />{t("landlord.profile.businessDetails")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">{t("landlord.profile.displayName")}</Label>
              <Input id="displayName" {...register("displayName")} />
              {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="businessName">{t("landlord.profile.businessName")}</Label>
              <Input id="businessName" {...register("businessName")} placeholder={t("landlord.profile.businessNamePlaceholder")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="officeAddress">{t("landlord.profile.officeAddress")}</Label>
              <Input id="officeAddress" {...register("officeAddress")} placeholder={t("landlord.profile.officeAddressPlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rcNumber">{t("landlord.profile.rcNumber")}</Label>
              <Input id="rcNumber" placeholder={t("landlord.profile.rcNumberPlaceholder")} {...register("rcNumber")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> {t("common.profile.saving")}</> : <><Save className="mr-2 h-4 w-4" aria-hidden /> {t("landlord.profile.saveProfile")}</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
