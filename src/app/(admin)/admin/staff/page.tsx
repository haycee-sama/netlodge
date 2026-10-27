"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { RoleBadge } from "@/components/shared/status-badges";
import { getRepositories } from "@/lib/repositories";
import { ADMIN_ROLES } from "@/lib/types";
import type { User } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";
import { Plus, UserCog } from "lucide-react";

export default function AdminStaffPage() {
  const [staff, setStaff] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Load all admin users
    Promise.all(ADMIN_ROLES.map((r) => getRepositories().users.list({ role: r, pageSize: 100 }))).then((results) => {
      setStaff(results.flatMap((r) => r.items));
      setLoading(false);
    });
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Staff management"
        title="Administrative staff"
        description="Verification officers, support agents, finance admins, and super admins. Add, suspend, or change roles from each user's detail page."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Staff" }]}
        actions={<Button><Plus className="mr-2 h-4 w-4" aria-hidden /> Invite staff</Button>}
      />
      <DemoModeBanner />

      {loading ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {staff.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{u.firstName} {u.lastName}</p>
                      <RoleBadge role={u.role} active={u.active} />
                    </div>
                    <p className="text-xs text-muted-foreground">{u.email} · last seen {u.lastSeenAt ? formatRelativeTime(u.lastSeenAt) : "—"}</p>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <a href={`/admin/users/${u.id}`}><UserCog className="mr-1 h-3.5 w-3.5" aria-hidden /> Manage</a>
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
