"use client";

import * as React from "react";
import { Users, Plus, MoreVertical, Mail, Briefcase, Shield, Loader2, AlertCircle } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
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

export default function LandlordStaffPage() {
  const { session } = useAuth();
  const [assignments, setAssignments] = React.useState<StaffAssignment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"property_manager" | "agent">("property_manager");
  const [perms, setPerms] = React.useState<string[]>([]);
  const [inviting, setInviting] = React.useState(false);
  const isSupabaseAuth = session?.authenticated === true;

  const fetchStaff = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      // Fetch property_assignments for properties owned by this landlord.
      // RLS on property_assignments restricts to the landlord's properties,
      // but we filter explicitly as defense-in-depth.
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

  React.useEffect(() => { fetchStaff(); }, [fetchStaff]);

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

  async function invite() {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setInviting(true);
    try {
      // Real staff invitation would require:
      // 1. Check if the email matches an existing user
      // 2. Create a property_assignment row (if the user exists)
      // 3. Send an invitation email (requires a server-side email service)
      //
      // Without an email service configured, we honestly tell the user
      // that the invitation system is not yet connected. We do NOT
      // pretend an email was sent.
      toast.info("Invitations not yet connected", {
        description: "Staff assignment is available once a team member registers. Ask them to create an account, then assign them to a property from the property detail page.",
      });
      setOpen(false);
      setName(""); setEmail(""); setRole("property_manager"); setPerms([]);
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Team"
        title="Staff & permissions"
        description="Add managers and agents. They see only what you assign — never your full finances or verification controls."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" aria-hidden /> Invite staff</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a team member</DialogTitle>
                <DialogDescription>Managers operate assigned properties. Agents manage enquiries and referrals.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label htmlFor="name">Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as "property_manager" | "agent")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="property_manager">Manager</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {role === "property_manager" && (
                  <div className="space-y-2">
                    <Label>Permissions</Label>
                    {[
                      { id: "manage_inventory", label: "Manage inventory (rooms, floors)" },
                      { id: "manage_bookings", label: "Manage bookings" },
                      { id: "manage_availability", label: "Manage availability" },
                      { id: "record_inspections", label: "Record inspections" },
                      { id: "view_assigned_finances", label: "View finances for assigned properties only" },
                    ].map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={perms.includes(p.id)}
                          onCheckedChange={(v) => setPerms((arr) => v ? [...arr, p.id] : arr.filter((x) => x !== p.id))}
                        />
                        <span>{p.label}</span>
                      </label>
                    ))}
                  </div>
                )}
                <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                  The invitee must create a NetLodge account first. After they register, assign them to a property from the property detail page.
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={invite} disabled={inviting}>
                  {inviting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Sending…</> : "Got it"}
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
          description="Assign a registered user to a property from the property detail page. They'll appear here with their assigned properties."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {staffByUser.map((s) => (
                <li key={s.userId} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar><AvatarFallback className="bg-primary/10 text-primary text-xs">{initials(...s.name.split(" "))}</AvatarFallback></Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{s.name}</p>
                        <Badge variant="outline" className="capitalize">{s.role === "property_manager" ? "manager" : "agent"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" aria-hidden />{s.email}</p>
                      {s.assignedProperties.length > 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Briefcase className="h-3 w-3" aria-hidden />{s.assignedProperties.length} assigned {s.assignedProperties.length === 1 ? "property" : "properties"}</p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More options"><MoreVertical className="h-4 w-4" aria-hidden /></Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
