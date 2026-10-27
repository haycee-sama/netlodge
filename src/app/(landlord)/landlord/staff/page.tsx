"use client";

import * as React from "react";
import { Users, Plus, MoreVertical, Mail, Briefcase, Shield, Loader2 } from "lucide-react";
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
import { toast } from "sonner";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: "manager" | "agent";
  assignedProperties: string[];
  active: boolean;
}

const demoStaff: StaffMember[] = [
  { id: "stf_1", name: "Chidi Anayo", email: "chidi@netlodge.demo", role: "manager", assignedProperties: ["Akoka Heights Hostel", "Bariga Gardens Residence"], active: true },
  { id: "stf_2", name: "Funmi Adebayo", email: "funmi@netlodge.demo", role: "agent", assignedProperties: ["Yaba Suites Apartments"], active: true },
];

export default function LandlordStaffPage() {
  const [staff, setStaff] = React.useState<StaffMember[]>(demoStaff);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"manager" | "agent">("manager");
  const [perms, setPerms] = React.useState<string[]>([]);

  function invite() {
    if (!name || !email) {
      toast.error("Name and email are required");
      return;
    }
    setStaff((s) => [...s, { id: `stf_${Date.now()}`, name, email, role, assignedProperties: [], active: true }]);
    toast.success("Invitation sent", { description: `${name} will receive an email to join as ${role}.` });
    setOpen(false);
    setName(""); setEmail(""); setRole("manager"); setPerms([]);
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
                  <Select value={role} onValueChange={(v) => setRole(v as "manager" | "agent")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {role === "manager" && (
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={invite}>Send invitation</Button>
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

      {staff.length === 0 ? (
        <EmptyState icon={<Users className="h-5 w-5" aria-hidden />} title="No team members" description="Invite a manager or agent to help operate your properties." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {staff.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar><AvatarFallback className="bg-primary/10 text-primary text-xs">{s.name.split(" ").map(w => w[0]).join("")}</AvatarFallback></Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{s.name}</p>
                        <Badge variant="outline" className="capitalize">{s.role}</Badge>
                        {!s.active && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" aria-hidden />{s.email}</p>
                      {s.assignedProperties.length > 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Briefcase className="h-3 w-3" aria-hidden />{s.assignedProperties.length} assigned {s.assignedProperties.length === 1 ? "property" : "properties"}</p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" aria-hidden /></Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
