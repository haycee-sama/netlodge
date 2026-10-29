"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, GraduationCap, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-components";
import { Logo } from "@/components/shared/logo";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { fetchUniversities } from "@/lib/supabase/property-service";
import { toast } from "sonner";

const onboardingSchema = z.object({
  universityId: z.string().min(1, "Select your university"),
  matricNumber: z.string().min(3, "Enter your matric number"),
  level: z.string().min(1, "Select your level"),
  department: z.string().min(2, "Enter your department"),
  emergencyContactName: z.string().min(3, "Emergency contact name is required"),
  emergencyContactPhone: z.string().min(10, "Enter a valid phone number"),
});

type OnboardingInput = z.infer<typeof onboardingSchema>;

const LEVELS = [
  { value: "100", label: "100 Level (Year 1)" },
  { value: "200", label: "200 Level (Year 2)" },
  { value: "300", label: "300 Level (Year 3)" },
  { value: "400", label: "400 Level (Year 4)" },
  { value: "500", label: "500 Level (Year 5)" },
  { value: "postgraduate", label: "Postgraduate" },
];

export default function StudentOnboardingPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [universities, setUniversities] = React.useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
  });

  const selectedUniversity = watch("universityId");
  const selectedLevel = watch("level");

  React.useEffect(() => {
    fetchUniversities().then((res) => {
      if (res.data) {
        setUniversities(res.data.map((u) => ({ id: u.id, name: u.name })));
      }
      setLoading(false);
    });
  }, []);

  async function onSubmit(values: OnboardingInput) {
    if (!session?.userId) return;
    setSaving(true);
    try {
      const supabase = createClient();

      // Upsert student profile
      const { error: profileError } = await supabase
        .from("student_profiles")
        .upsert({
          user_id: session.userId,
          university_id: values.universityId,
          matric_number: values.matricNumber,
          level: values.level,
          department: values.department,
          emergency_contact_name: values.emergencyContactName,
          emergency_contact_phone: values.emergencyContactPhone,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw new Error(profileError.message);

      // Mark profile as completed
      const { error: completedError } = await supabase
        .from("profiles")
        .update({
          profile_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.userId);

      if (completedError) throw new Error(completedError.message);

      toast.success("Onboarding complete", {
        description: "Your profile is set up. You can now browse and book rooms.",
      });

      router.push("/student");
      router.refresh();
    } catch (e) {
      toast.error("Could not save onboarding", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col items-center text-center">
        <Logo size="lg" />
        <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">
          Complete your student profile
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground text-pretty">
          Tell us about yourself so you can book verified accommodation. This information
          helps landlords verify you as a student.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-success-foreground">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          </div>
          <span className="text-xs font-medium">Account created</span>
        </div>
        <div className="h-px w-8 bg-border" />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" aria-hidden />
          </div>
          <span className="text-xs font-medium">Student profile</span>
        </div>
        <div className="h-px w-8 bg-border" />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border text-muted-foreground">
            <span className="text-xs">3</span>
          </div>
          <span className="text-xs text-muted-foreground">Start booking</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Academic details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>University *</Label>
              <Select value={selectedUniversity} onValueChange={(v) => setValue("universityId", v)}>
                <SelectTrigger><SelectValue placeholder="Select your university" /></SelectTrigger>
                <SelectContent>
                  {universities.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.universityId && <p className="text-xs text-destructive">{errors.universityId.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="matricNumber">Matric number *</Label>
                <Input id="matricNumber" placeholder="e.g. CSC/2021/001" {...register("matricNumber")} />
                {errors.matricNumber && <p className="text-xs text-destructive">{errors.matricNumber.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Level *</Label>
                <Select value={selectedLevel} onValueChange={(v) => setValue("level", v)}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.level && <p className="text-xs text-destructive">{errors.level.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="department">Department *</Label>
              <Input id="department" placeholder="e.g. Computer Science" {...register("department")} />
              {errors.department && <p className="text-xs text-destructive">{errors.department.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emergency contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              We need an emergency contact in case of issues with your booking. This information
              is kept private and never shown to landlords.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="emergencyContactName">Contact name *</Label>
                <Input id="emergencyContactName" placeholder="e.g. John Doe" {...register("emergencyContactName")} />
                {errors.emergencyContactName && <p className="text-xs text-destructive">{errors.emergencyContactName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emergencyContactPhone">Contact phone *</Label>
                <Input id="emergencyContactPhone" placeholder="e.g. 0801 234 5678" {...register("emergencyContactPhone")} />
                {errors.emergencyContactPhone && <p className="text-xs text-destructive">{errors.emergencyContactPhone.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => router.push("/student")}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            Skip for now
          </Button>
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Saving…</>
            ) : (
              <>Complete profile <ArrowRight className="ml-2 h-4 w-4" aria-hidden /></>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
