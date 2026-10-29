"use client";

import * as React from "react";
import { Users, Plus, MoreVertical, Mail, Briefcase, Shield, Loader2, AlertCircle, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { fetchLandlordProperties } from "@/lib/supabase/landlord-service";
import { initials } from "@/lib/utils/format";
import { toast } from "sonner";

interface StaffAssignment {
  id: string;
  user_id: string;
  role: "property_manager" | "agent";
  assigned_at: string;
  profiles: { first_name: string; last_name: string; email: string } | null;
  properties: { name: string } | null;
}

interface LandlordProperty {
  id: string;
  name: string;
}

export default function LandlordStaffPage() {
  const { session } = useAuth();
  const [assignments, setAssignments] = React.useState<StaffAssignment[]>([]);
  const [properties, setProperties] = React.useState<LandlordProperty[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [propertyId, setPropertyId] = React.useState("");
  const [role, setRole] = React.useState<"property_manager" | "agent">("property_manager");
  const [assigning, setAssigning] = React.useState(false);
  const isSupabaseAuth = session?.authenticated === true;

  const fetchStaff = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("property_assignments")
        .select(`
          id, user_id, role, assigned_at,
          profiles!inner(first_name, last_name, email),
          properties!inner(name, landlord_id)
        `)
        .eq("properties.landlord_id", session!.userId)
        .order("assigned_at", { ascending: false });

      if (error) throw new Error(error.message);
      setAssignments((data ?? []) as unknown as StaffAssignment[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [isSupabaseAuth, session]);

  React.useEffect(() => {
    fetchStaff();
    // Also load the landlord's properties for the assignment dropdown
    if (isSupabaseAuth) {
      fetchLandlordProperties().then((res) => {
        if (res.data) {
          setProperties(res.data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
        }
      });
    }
  }, [fetchStaff, isSupabaseAuth]);

  // Group assignments by user to show one row per staff member
  const staffByUser = React.useMemo(() => {
    const map = new Map<string, {
      userId: string;
      name: string;
      email: string;
      role: string;
      assignedProperties: string[];
      assignedAt: string;
    }>();
    for (const a of assignments) {
      if (!a.profiles) continue;
      const existing = map.get(a.user_id);
      if (existing) {
        if (a.properties?.name) existing.assignedProperties.push(a.properties.name);
      } else {
        map.set(a.user_id, {
          userId: a.user_id,
          name: `${a.profiles.first_name} ${a.profiles.last_name}`.trim() || a.profiles.email,
          email: a.profiles.email,
          role: a.role,
          assignedProperties: a.properties?.name ? [a.properties.name] : [],
          assignedAt: a.assigned_at,
        });
      }
    }
    return Array.from(map.values());
  }, [assignments]);

  async function handleAssign() {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!propertyId) {
      toast.error("Select a property");
      return;
    }
    setAssigning(true);
    try {
      const res = await fetch("/api/landlord/staff/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), propertyId, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not assign staff", {
          description: data.description,
        });
        return;
      }
      toast.success("Staff assigned", {
        description: `${data.staffName} is now assigned as ${role === "property_manager" ? "manager" : "agent"}.`,
      });
      setOpen(false);
      setEmail(""); setPropertyId(""); setRole("property_manager");
      fetchStaff(); // refresh the list
    } catch (e) {
      toast.error("Could not assign staff", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Team"
        title="Staff & permissions"
        description="Assign registered users to your properties as managers or agents. They see only what you assign."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={properties.length === 0}>
                <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                Assign staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign a team member</DialogTitle>
                <DialogDescription>
                  Enter the email of a registered NetLodge user and select a property to assign them to.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">User email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. manager@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    The user must already have a NetLodge account with this email.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Property</Label>
                  <Select value={propertyId} onValueChange={setPropertyId}>
                    <SelectTrigger><SelectValue placeholder="Select a property" /></SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as "property_manager" | "agent")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="property_manager">Manager — operate assigned properties</SelectItem>
                      <SelectItem value="agent">Agent — manage enquiries and referrals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleAssign} disabled={assigning}>
                  {assigning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Assigning…</> : "Assign"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="border-warning/30 bg-warning/10">
        <CardContent className="flex items-start gap-2 p-3 text-xs text-warning-foreground">
          <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Managers cannot change your payout account, transfer ownership, view unassigned finances, or approve verification. Agents gain no access to pricing, payments, ownership information, or verification.</span>
        </CardContent>
      </Card>

      {properties.length === 0 && (
        <Card className="border-info/30 bg-info/5">
          <CardContent className="flex items-start gap-2 p-3 text-xs text-info-foreground">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>You need at least one property before you can assign staff. <a href="/landlord/properties/new" className="underline">Add a property</a> first.</span>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertCircle className="h-5 w-5" aria-hidden />}
          title="Could not load staff"
          description={error}
          action={<Button variant="outline" onClick={fetchStaff}>Retry</Button>}
        />
      ) : staffByUser.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" aria-hidden />}
          title="No team members assigned"
          description="Assign a registered user to one of your properties. Enter their email and select a property to get started."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {staffByUser.map((s) => (
                <li key={s.userId} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {initials(s.name.split(" ")[0], s.name.split(" ")[1])}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{s.name}</p>
                        <Badge variant="outline" className="capitalize">
                          {s.role === "property_manager" ? "manager" : "agent"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" aria-hidden />{s.email}
                      </p>
                      {s.assignedProperties.length > 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Briefcase className="h-3 w-3" aria-hidden />
                          {s.assignedProperties.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More options">
                    <MoreVertical className="h-4 w-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
