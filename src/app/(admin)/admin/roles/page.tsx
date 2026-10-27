"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { can, type Action } from "@/lib/auth/permissions";
import { USER_ROLES, roleLabel } from "@/lib/types";

const ALL_ACTIONS: Action[] = [
  "property:create", "property:edit_own", "property:edit_assigned", "property:delete", "property:view_all",
  "room:create", "room:bulk_edit", "room:price_override", "floor:manage",
  "booking:view_own", "booking:view_assigned", "booking:view_all", "booking:cancel", "availability:manage",
  "verification:submit", "verification:review", "verification:approve", "verification:reject", "verification:assign", "verification:escalate", "verification:record_inspection", "verification:view_history",
  "support:view_own", "support:view_all", "support:assign", "support:reply_as_staff", "support:escalate", "support:manage_kb",
  "payout:configure_account", "payout:view", "payout:view_all", "payout:approve", "payout:reject", "payout:reverse",
  "finance:view_own", "finance:view_assigned", "finance:view_all", "finance:refund:approve", "finance:refund:reject", "finance:reconcile", "finance:view_audit",
  "admin:manage_users", "admin:manage_roles", "admin:manage_staff", "admin:manage_settings", "admin:view_audit", "admin:manage_integrations", "admin:view_reports", "admin:manage_universities", "admin:manage_facilities", "admin:manage_commissions", "admin:manage_notifications",
  "staff:manage", "enquiry:manage", "referral:view", "inspection:record",
];

export default function AdminRolesPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Access control"
        title="Roles & permissions"
        description="The role-permission matrix for every NetLodge role. Permissions are enforced server-side via Supabase RLS policies."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Roles & permissions" }]}
      />
      <DemoModeBanner message="This matrix is read-only in demo mode. In production, role-permission mappings are stored in the database and changes require super-admin reauthentication and are audit-logged." />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="sticky left-0 bg-muted/30 px-3 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">Permission</th>
                  {USER_ROLES.map((r) => (
                    <th key={r} className="px-3 py-2 text-center font-semibold uppercase tracking-wider text-muted-foreground">{roleLabel(r)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_ACTIONS.map((action) => (
                  <tr key={action} className="border-b border-border last:border-0">
                    <td className="sticky left-0 bg-background px-3 py-2 font-mono text-xs">{action}</td>
                    {USER_ROLES.map((r) => (
                      <td key={r} className="px-3 py-2 text-center">
                        {can(r, action) ? (
                          <Badge variant="outline" className="border-success/30 bg-success/10 text-success">✓</Badge>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Role descriptions</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            { role: "student" as const, desc: "Browse, save, and book accommodation. Can only view their own bookings and payments." },
            { role: "landlord" as const, desc: "List properties, manage rooms, set prices, view own finances, manage staff. Cannot self-approve verification." },
            { role: "manager" as const, desc: "Operate assigned properties only — inventory, bookings, availability, inspections. No access to landlord finances or verification." },
            { role: "agent" as const, desc: "Manage enquiries and referrals for assigned properties. No access to pricing, payments, or verification." },
            { role: "verification_officer" as const, desc: "Review and approve/reject KYC, landlord, property, and room evidence submissions. Cannot manage users or finances." },
            { role: "support_staff" as const, desc: "Handle customer support tickets, escalate to other teams, manage knowledge base. Cannot alter financial records." },
            { role: "finance_admin" as const, desc: "Approve/reject payouts and refunds, run reconciliation, view financial audit trail. Cannot fabricate payments or edit immutable ledger." },
            { role: "super_admin" as const, desc: "Platform-wide control: users, roles, settings, integrations, oversight of all operations. High-risk actions still require reauthentication and dual approval." },
          ].map((r) => (
            <div key={r.role}>
              <p className="font-medium">{roleLabel(r.role)}</p>
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
