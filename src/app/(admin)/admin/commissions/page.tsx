"use client";

import { CommissionsView } from "@/components/admin/commissions-view";

/**
 * /admin/commissions — super_admin view of the platform commission summary.
 * Reuses the same shared component as /admin/finance/commissions.
 */
export default function AdminCommissionsPage() {
  return (
    <CommissionsView
      eyebrow="Platform configuration"
      breadcrumbs={[{ label: "Super Admin", href: "/admin" }, { label: "Commissions" }]}
    />
  );
}
