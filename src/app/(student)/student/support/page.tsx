"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LifeBuoy, Send, Plus, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { supportTickets as allTickets } from "@/lib/data/fixtures";
import { supportTicketSchema, type SupportTicketInput } from "@/lib/validators";
import type { SupportTicket } from "@/lib/types";
import { formatDate, formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";

const priorityTone: Record<string, string> = {
  low: "border-border bg-muted text-muted-foreground",
  medium: "border-info/30 bg-info/10 text-info",
  high: "border-warning/30 bg-warning/15 text-warning-foreground",
  urgent: "border-destructive/30 bg-destructive/10 text-destructive",
};

const statusTone: Record<string, string> = {
  open: "border-warning/30 bg-warning/10 text-warning-foreground",
  in_progress: "border-info/30 bg-info/10 text-info",
  awaiting_user: "border-warning/30 bg-warning/10 text-warning-foreground",
  resolved: "border-success/30 bg-success/10 text-success",
  closed: "border-border bg-muted text-muted-foreground",
};

export default function StudentSupportPage() {
  const { session } = useAuth();
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [open, setOpen] = React.useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupportTicketInput>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: { priority: "medium", category: "General" } as never,
  });

  React.useEffect(() => {
    if (!session) return;
    getRepositories().support.listByUser(session.userId || "dev_student_1").then(setTickets);
  }, [session]);

  const category = watch("category");
  const priority = watch("priority");

  async function onSubmit(values: SupportTicketInput) {
    const created = await getRepositories().support.create(values);
    setTickets((t) => [created, ...t]);
    setOpen(false);
    reset();
    toast.success("Ticket created", {
      description: `Reference ${created.reference}. We respond within 4 hours.`,
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Support"
        title="Help & support"
        description="Open a ticket, track its status, and message our support team."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                New ticket
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Open a support ticket</DialogTitle>
                <DialogDescription>
                  Tell us what's going on. We respond within 4 hours during business hours.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="Brief summary of the issue" {...register("subject")} />
                  {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select
                      value={category}
                      onValueChange={(v) => setValue("category", v as SupportTicketInput["category"])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Bookings", "Payments", "Verification", "Account", "Property listing", "Safety", "Other"].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select
                      value={priority}
                      onValueChange={(v) => setValue("priority", v as SupportTicketInput["priority"])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" rows={5} placeholder="Describe your issue in detail…" {...register("message")} />
                  {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Creating…
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" aria-hidden /> Create ticket
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {tickets.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy className="h-5 w-5" aria-hidden />}
          title="No support tickets"
          description="Need help? Open a ticket and a human will respond within 4 hours."
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Card key={t.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{t.subject}</p>
                      <Badge variant="outline" className={`text-xs capitalize ${statusTone[t.status]}`}>
                        {t.status.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline" className={`text-xs capitalize ${priorityTone[t.priority]}`}>
                        {t.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t.reference} · {t.category} · Updated {formatRelativeTime(t.updatedAt)}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-pretty">{t.message}</p>
                {t.replies.length > 0 && (
                  <div className="space-y-2 border-t border-border pt-3">
                    {t.replies.map((r) => (
                      <div key={r.id} className="flex gap-2">
                        <MessageSquare className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${r.author === "support" ? "text-primary" : "text-muted-foreground"}`} aria-hidden />
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {r.author === "support" ? "NetLodge Support" : "You"} · {formatDate(r.createdAt)}
                          </p>
                          <p className="text-sm">{r.message}</p>
                        </div>
                      </div>
                    ))}
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
