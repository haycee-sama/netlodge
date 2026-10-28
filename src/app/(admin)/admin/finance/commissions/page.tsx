"use client";

import { CommissionsView } from "@/components/admin/commissions-view";

/**
 * /admin/finance/commissions — finance_admin view of the platform commission
 * summary. Reuses the same shared component as /admin/commissions.
 */
export default function FinanceCommissionsPage() {
  return (
    <CommissionsView
      eyebrow="Finance operations"
      breadcrumbs={[{ label: "Finance Admin", href: "/admin/finance" }, { label: "Commissions" }]}
    />
  );
}
