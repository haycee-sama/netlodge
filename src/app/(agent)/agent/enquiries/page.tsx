"use client";

import * as React from "react";
import Link from "next/link";
import { MessageSquare, Send, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { properties as allProperties } from "@/lib/data/fixtures";
import { formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";

interface Enquiry { id: string; studentName: string; email: string; propertyId: string; message: string; createdAt: string; status: "new" | "responded" | "closed"; }

const demoEnquiries: Enquiry[] = [
  { id: "enq_1", studentName: "Tunde Bello", email: "tunde@example.com", propertyId: "prop_akoka_heights", message: "Is G-101 still available for September intake?", createdAt: new Date(Date.now() - 3600000).toISOString(), status: "new" },
  { id: "enq_2", studentName: "Aisha Mohammed", email: "aisha@example.com", propertyId: "prop_yaba_suites", message: "Can I view Apartment A-1 this weekend?", createdAt: new Date(Date.now() - 86400000).toISOString(), status: "responded" },
  { id: "enq_3", studentName: "Chinwe Eze", email: "chinwe@example.com", propertyId: "prop_bariga_gardens", message: "What's the annual rent including service charge?", createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), status: "closed" },
];

export default function AgentEnquiriesPage() {
  const [enquiries, setEnquiries] = React.useState<Enquiry[]>(demoEnquiries);
  const [q, setQ] = React.useState("");
  const [respondingTo, setRespondingTo] = React.useState<string | null>(null);
  const [response, setResponse] = React.useState("");

  const filtered = q ? enquiries.filter((e) => `${e.studentName} ${e.message}`.toLowerCase().includes(q.toLowerCase())) : enquiries;

  function send() {
    if (!response.trim()) {
      toast.error("Write a response");
      return;
    }
    setEnquiries((arr) => arr.map((e) => (e.id === respondingTo ? { ...e, status: "responded" } : e)));
    toast.success("Response sent");
    setRespondingTo(null);
    setResponse("");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow="Leads" title="Student enquiries" description="Respond to questions from prospective students about your assigned properties." />
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" placeholder="Search enquiries…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={<MessageSquare className="h-5 w-5" aria-hidden />} title="No enquiries" description="When students contact you about your assigned properties, their messages appear here." />
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => {
            const property = allProperties.find((p) => p.id === e.propertyId);
            return (
              <Card key={e.id}>
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{e.studentName}</p>
                      <p className="text-xs text-muted-foreground">{e.email} · {formatRelativeTime(e.createdAt)}</p>
                    </div>
                    <Badge variant="outline" className={`capitalize ${e.status === "new" ? "border-warning/30 bg-warning/10 text-warning-foreground" : e.status === "responded" ? "border-info/30 bg-info/10 text-info" : "border-border bg-muted text-muted-foreground"}`}>{e.status}</Badge>
                  </div>
                  <p className="text-sm text-foreground/90 text-pretty">{e.message}</p>
                  <p className="text-xs"><Link href={`/properties/${property?.slug}`} className="text-primary hover:underline">{property?.name}</Link></p>
                  <div className="flex gap-2 pt-1">
                    <Dialog open={respondingTo === e.id} onOpenChange={(v) => { setRespondingTo(v ? e.id : null); setResponse(""); }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline"><Send className="mr-1 h-3 w-3" aria-hidden /> Respond</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Respond to {e.studentName}</DialogTitle></DialogHeader>
                        <div className="space-y-1.5">
                          <Label htmlFor="response">Your response</Label>
                          <Textarea id="response" rows={5} placeholder="Write a clear, helpful response…" value={response} onChange={(ev) => setResponse(ev.target.value)} />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setRespondingTo(null)}>Cancel</Button>
                          <Button onClick={send}>Send response</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    {e.status !== "closed" && (
                      <Button size="sm" variant="ghost" onClick={() => { setEnquiries((arr) => arr.map((x) => x.id === e.id ? { ...x, status: "closed" } : x)); toast.success("Enquiry closed"); }}>Close</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
