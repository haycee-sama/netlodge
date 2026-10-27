"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, User, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { universities } from "@/lib/data/fixtures";
import { studentProfileSchema, type StudentProfileInput } from "@/lib/validators";
import { initials } from "@/lib/utils/format";
import { toast } from "sonner";

export default function StudentProfilePage() {
  const { session } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentProfileInput>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: {
      firstName: session?.firstName ?? "",
      lastName: session?.lastName ?? "",
      email: session?.email,
    } as never,
  });

  async function onSubmit(_values: StudentProfileInput) {
    await new Promise((r) => setTimeout(r, 500));
    toast.success("Profile saved", {
      description: "Your changes have been saved locally (demo mode).",
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Profile"
        title="Your profile"
        description="Tell us about yourself so we can recommend the right accommodation."
      />

      {/* Identity card */}
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {initials(session?.firstName, session?.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="font-display text-lg font-semibold">
              {session?.firstName} {session?.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{session?.email}</p>
            <Badge variant="outline" className="capitalize">{session?.role}</Badge>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" placeholder="+234 800 000 0000" {...register("phone")} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="universityId">University</Label>
              <select
                id="universityId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register("universityId")}
              >
                <option value="">Select your university</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>{u.shortName} — {u.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="matricNumber">Matric number</Label>
              <Input id="matricNumber" placeholder="e.g. 2023/123456" {...register("matricNumber")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="level">Level</Label>
              <Input id="level" placeholder="e.g. 300L" {...register("level")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" placeholder="e.g. Mass Communication" {...register("department")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" rows={3} placeholder="Tell landlords a little about yourself…" {...register("bio")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emergency contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="emergencyContactName">Contact name</Label>
              <Input id="emergencyContactName" {...register("emergencyContactName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergencyContactPhone">Contact phone</Label>
              <Input id="emergencyContactPhone" type="tel" {...register("emergencyContactPhone")} />
              {errors.emergencyContactPhone && <p className="text-xs text-destructive">{errors.emergencyContactPhone.message}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" aria-hidden /> Save profile
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
