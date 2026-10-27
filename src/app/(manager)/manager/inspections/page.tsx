"use client";

import * as React from "react";
import { ClipboardCheck, Plus, Calendar, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { getRepositories } from "@/lib/repositories";
import type { Property } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { toast } from "sonner";

interface Inspection {
  id: string;
  propertyId: string;
  date: string;
  findings: string;
  recommendations: string;
  status: "scheduled" | "completed";
}

const demoInspections: Inspection[] = [
  { id: "insp_1", propertyId: "prop_akoka_heights", date: new Date(Date.now() + 86400000 * 2).toISOString(), findings: "All fire exits clear. Smoke detectors tested.", recommendations: "Replace one broken ceiling fan in room G-102.", status: "scheduled" },
  { id: "insp_2", propertyId: "prop_bariga_gardens", date: new Date(Date.now() - 86400000 * 5).toISOString(), findings: "Borehole pump serviced. Shared kitchen cleaned.", recommendations: "Repaint stairwell.", status: "completed" },
];

export default function ManagerInspectionsPage() {
  const { session } = useAuth();
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [inspections, setInspections] = React.useState<Inspection[]>(demoInspections);
  const [open, setOpen] = React.useState(false);
  const [propertyId, setPropertyId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [findings, setFindings] = React.useState("");
  const [recommendations, setRecommendations] = React.useState("");

  React.useEffect(() => {
    if (!session) return;
    getRepositories().properties.listByManager(session.userId || "dev_manager_1").then(setProperties);
  }, [session]);

  function record() {
    if (!propertyId || !date || !findings) {
      toast.error("Property, date and findings are required");
      return;
    }
    setInspections((arr) => [
      { id: `insp_${Date.now()}`, propertyId, date: new Date(date).toISOString(), findings, recommendations, status: "completed" },
      ...arr,
    ]);
    toast.success("Inspection recorded");
    setOpen(false);
    setPropertyId(""); setDate(""); setFindings(""); setRecommendations("");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Inspections"
        title="Inspection records"
        description="Record on-site inspections for your assigned properties."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" aria-hidden /> New inspection</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record an inspection</DialogTitle>
                <DialogDescription>Document findings and recommendations from an on-site visit.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Property</Label>
                  <Select value={propertyId} onValueChange={setPropertyId}>
                    <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date">Inspection date</Label>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="findings">Findings</Label>
                  <Textarea id="findings" rows={3} value={findings} onChange={(e) => setFindings(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="recommendations">Recommendations (optional)</Label>
                  <Textarea id="recommendations" rows={2} value={recommendations} onChange={(e) => setRecommendations(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={record}>Record inspection</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {inspections.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="h-5 w-5" aria-hidden />} title="No inspections yet" description="Record your first on-site inspection." />
      ) : (
        <div className="space-y-3">
          {inspections.map((i) => {
            const property = properties.find((p) => p.id === i.propertyId);
            return (
              <Card key={i.id}>
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{property?.name ?? "Property"}</p>
                    <Badge variant="outline" className={i.status === "completed" ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning-foreground"}>{i.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" aria-hidden />{formatDate(i.date)}</p>
                  <p className="text-sm"><span className="text-muted-foreground">Findings:</span> {i.findings}</p>
                  {i.recommendations && <p className="text-sm"><span className="text-muted-foreground">Recommendations:</span> {i.recommendations}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
