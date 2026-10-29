"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, Loader2, AlertCircle, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";

interface Enquiry {
  id: string;
  reference: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  student_profiles?: { first_name: string; last_name: string }[] | null;
}

export default function AgentEnquiriesPage() {
  const { session } = useAuth();
  const [enquiries, setEnquiries] = React.useState<Enquiry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const isSupabaseAuth = session?.authenticated === true;

  const fetchEnquiries = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      // Agents see support tickets — they can handle student enquiries
      // through the ticket system. RLS restricts to tickets the agent
      // is permitted to see (their own + tickets on their assigned
      // properties if the policy allows).
      const { data, error } = await supabase
        .from("support_tickets")
        .select(`
          id, reference, subject, category, status, priority, created_at,
          student_profiles(first_name, last_name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);
      setEnquiries((data ?? []) as Enquiry[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load enquiries");
    } finally {
      setLoading(false);
    }
  }, [isSupabaseAuth]);

  React.useEffect(() => { fetchEnquiries(); }, [fetchEnquiries]);

  const filtered = enquiries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.subject.toLowerCase().includes(q) ||
      e.reference.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q);
  });

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader eyebrow="Agent" title="Enquiries" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real account to view enquiries.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Agent"
        title="Enquiries"
        description="Student enquiries and support tickets. Respond promptly to convert enquiries into bookings."
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          placeholder="Search by subject, reference, or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertCircle className="h-5 w-5" aria-hidden />}
          title="Could not load enquiries"
          description={error}
          action={<Button variant="outline" onClick={fetchEnquiries}>Retry</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-5 w-5" aria-hidden />}
          title={search ? "No matching enquiries" : "No enquiries yet"}
          description={search
            ? "Try a different search term."
            : "Student enquiries will appear here when students submit support tickets."}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {filtered.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{e.subject}</p>
                      <Badge
                        variant={e.status === "open" ? "default" : e.status === "resolved" ? "outline" : "secondary"}
                        className="capitalize text-xs"
                      >
                        {e.status}
                      </Badge>
                      {e.priority === "urgent" || e.priority === "high" ? (
                        <Badge variant="destructive" className="text-xs capitalize">{e.priority}</Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {e.reference} · {e.category} · {formatRelativeTime(e.created_at)}
                      {e.student_profiles && e.student_profiles[0] && ` · ${e.student_profiles[0].first_name} ${e.student_profiles[0].last_name}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
