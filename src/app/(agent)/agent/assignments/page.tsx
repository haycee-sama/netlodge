"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Loader2, AlertCircle, Mail, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils/format";

interface Assignment {
  id: string;
  role: string;
  assigned_at: string;
  properties: { id: string; name: string; slug: string; city: string; status: string } | null;
  assigned_by_profile: { first_name: string; last_name: string } | null;
}

export default function AgentAssignmentsPage() {
  const { session } = useAuth();
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    // Fetch property_assignments for this agent. RLS restricts to
    // assignments where user_id = auth.uid() or the landlord's own.
    supabase
      .from("property_assignments")
      .select(`
        id, role, assigned_at,
        properties!inner(id, name, slug, city, status),
        profiles!property_assignments_assigned_by_fkey(first_name, last_name)
      `)
      .eq("user_id", session!.userId)
      .order("assigned_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          setAssignments((data ?? []) as unknown as Assignment[]);
        }
        setLoading(false);
      });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader eyebrow="Agent" title="Assignments" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real account to view your assignments.
        </CardContent></Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader eyebrow="Agent" title="Assignments" />
        <EmptyState
          icon={<AlertCircle className="h-5 w-5" aria-hidden />}
          title="Could not load assignments"
          description={error}
          action={<Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Agent"
        title="Your assignments"
        description="Properties you've been assigned to manage. Contact your landlord if you need a new assignment."
      />

      {assignments.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-5 w-5" aria-hidden />}
          title="No assignments yet"
          description="You haven't been assigned to any properties. Ask your landlord to assign you from their Staff & permissions page."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/agent/properties`} className="font-medium hover:text-primary">
                      {a.properties?.name ?? "Unknown property"}
                    </Link>
                    <p className="text-xs text-muted-foreground">{a.properties?.city ?? "—"}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {a.role === "property_manager" ? "Manager" : "Agent"}
                  </Badge>
                </div>
                {a.properties && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Briefcase className="h-3 w-3" aria-hidden />
                    <span className="capitalize">{a.properties.status.replace(/_/g, " ")}</span>
                  </div>
                )}
                {a.assigned_by_profile && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {initials(a.assigned_by_profile.first_name, a.assigned_by_profile.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>Assigned by {a.assigned_by_profile.first_name} {a.assigned_by_profile.last_name}</span>
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
