"use client";

import * as React from "react";
import Link from "next/link";
import { Wrench, Loader2, AlertCircle, Plus, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime, generateReference } from "@/lib/utils/format";
import { toast } from "sonner";

interface MaintenanceRequest {
  id: string;
  reference: string;
  category: string;
  priority: string;
  status: string;
  title: string;
  description: string;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  properties: { name: string }[] | null;
  rentable_units: { identifier: string }[] | null;
}

const CATEGORIES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "structural", label: "Structural" },
  { value: "appliance", label: "Appliance" },
  { value: "pest_control", label: "Pest Control" },
  { value: "security", label: "Security" },
  { value: "cleanliness", label: "Cleanliness" },
  { value: "other", label: "Other" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function MaintenancePage({ role }: { role: "student" | "landlord" }) {
  const { session } = useAuth();
  const [requests, setRequests] = React.useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const isSupabaseAuth = session?.authenticated === true;

  // Form state
  const [bookings, setBookings] = React.useState<{ id: string; property_id: string; property_name: string; unit_id: string; unit_identifier: string }[]>([]);
  const [selectedBooking, setSelectedBooking] = React.useState("");
  const [category, setCategory] = React.useState("plumbing");
  const [priority, setPriority] = React.useState("medium");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const fetchRequests = React.useCallback(async () => {
    if (!isSupabaseAuth || !session?.userId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const supabase = createClient();

    let query = supabase
      .from("maintenance_requests")
      .select(`
        id, reference, category, priority, status, title, description,
        resolution_notes, created_at, resolved_at,
        properties(name), rentable_units(identifier)
      `)
      .order("created_at", { ascending: false });

    if (role === "student") {
      query = query.eq("student_id", session.userId);
    }

    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
    } else {
      setRequests((data ?? []) as MaintenanceRequest[]);
    }
    setLoading(false);
  }, [isSupabaseAuth, session?.userId, role]);

  React.useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // For students: load their active bookings to populate the form dropdown
  React.useEffect(() => {
    if (role !== "student" || !isSupabaseAuth || !session?.userId) return;
    const supabase = createClient();
    supabase
      .from("bookings")
      .select(`
        id, property_id, rentable_unit_id,
        properties(name), rentable_units(identifier)
      `)
      .eq("student_id", session.userId)
      .in("status", ["confirmed", "active"])
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setBookings(data.map((b: any) => ({
            id: b.id,
            property_id: b.property_id,
            property_name: b.properties?.name ?? "Property",
            unit_id: b.rentable_unit_id,
            unit_identifier: b.rentable_units?.identifier ?? "",
          })));
        }
      });
  }, [role, isSupabaseAuth, session?.userId]);

  async function submitRequest() {
    if (!selectedBooking || !title.trim() || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const booking = bookings.find((b) => b.id === selectedBooking);
      if (!booking) {
        toast.error("Select a valid booking");
        setSubmitting(false);
        return;
      }
      const supabase = createClient();
      const { error: insertError } = await supabase.from("maintenance_requests").insert({
        reference: generateReference("MNT"),
        student_id: session!.userId,
        property_id: booking.property_id,
        rentable_unit_id: booking.unit_id,
        booking_id: booking.id,
        category,
        priority,
        title: title.trim(),
        description: description.trim(),
      });
      if (insertError) throw new Error(insertError.message);

      toast.success("Request submitted", {
        description: "Your landlord will be notified. You can track the status here.",
      });
      setShowForm(false);
      setTitle(""); setDescription(""); setSelectedBooking("");
      fetchRequests();
    } catch (e) {
      toast.error("Could not submit request", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(reqId: string, status: string, notes?: string) {
    const supabase = createClient();
    const update: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "resolved") {
      update.resolved_at = new Date().toISOString();
      update.resolved_by = session?.userId;
      if (notes) update.resolution_notes = notes;
    }
    const { error } = await supabase.from("maintenance_requests").update(update).eq("id", reqId);
    if (error) {
      toast.error("Could not update status", { description: error.message });
    } else {
      toast.success(`Marked as ${status}`);
      fetchRequests();
    }
  }

  const statusBadge = (status: string) => {
    const variant = status === "open" ? "destructive" : status === "in_progress" ? "default" : status === "resolved" ? "outline" : "secondary";
    return <Badge variant={variant as any} className="capitalize text-xs">{status.replace(/_/g, " ")}</Badge>;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={role === "student" ? "Support" : "Operations"}
        title="Maintenance requests"
        description={role === "student"
          ? "Report issues with your accommodation — plumbing, electrical, appliances, and more."
          : "Track and resolve maintenance issues reported by students at your properties."}
        actions={role === "student" && bookings.length > 0 ? (
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" aria-hidden /> New request</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Report a maintenance issue</DialogTitle>
                <DialogDescription>Describe the problem and we'll notify your landlord.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Booking *</Label>
                  <Select value={selectedBooking} onValueChange={setSelectedBooking}>
                    <SelectTrigger><SelectValue placeholder="Select your booking" /></SelectTrigger>
                    <SelectContent>
                      {bookings.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.property_name} — Unit {b.unit_identifier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. AC not cooling" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe the issue in detail…" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={submitRequest} disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                  Submit request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : undefined}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden /></div>
      ) : error ? (
        <EmptyState icon={<AlertCircle className="h-5 w-5" aria-hidden />} title="Could not load requests" description={error} action={<Button variant="outline" onClick={fetchRequests}>Retry</Button>} />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-5 w-5" aria-hidden />}
          title="No maintenance requests"
          description={role === "student"
            ? bookings.length > 0 ? "Report an issue and your landlord will be notified." : "You need an active booking to report maintenance issues."
            : "Student-reported issues will appear here."}
        />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{r.title}</p>
                      {statusBadge(r.status)}
                      {r.priority === "urgent" && <Badge variant="destructive" className="text-xs">Urgent</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.reference} · {r.properties?.[0]?.name ?? "—"} · Unit {r.rentable_units?.[0]?.identifier ?? "—"} · {formatRelativeTime(r.created_at)}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{r.description}</p>
                {r.resolution_notes && (
                  <div className="rounded-lg bg-success/5 p-3">
                    <p className="text-xs font-semibold text-success">Resolution</p>
                    <p className="mt-1 text-sm">{r.resolution_notes}</p>
                    {r.resolved_at && <p className="mt-1 text-xs text-muted-foreground">Resolved {formatRelativeTime(r.resolved_at)}</p>}
                  </div>
                )}
                {role === "landlord" && r.status !== "resolved" && r.status !== "cancelled" && (
                  <div className="flex gap-2 pt-1">
                    {r.status === "open" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "in_progress")}>
                        Start working
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="border-success/40 text-success hover:bg-success/10" onClick={() => {
                      const notes = prompt("Resolution notes (optional):");
                      updateStatus(r.id, "resolved", notes ?? undefined);
                    }}>
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                      Mark resolved
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
