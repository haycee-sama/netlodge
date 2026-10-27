"use client";

import * as React from "react";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { VerificationCaseTable } from "@/components/admin/verification-case-table";
import { getRepositories } from "@/lib/repositories";
import type { VerificationRecord } from "@/lib/types";

export default function VerificationLandlordsPage() {
  const [rows, setRows] = React.useState<VerificationRecord[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  React.useEffect(() => {
    setLoading(true);
    getRepositories().verification.listAll({ entityType: "landlord", q: q || undefined, page, pageSize }).then((r) => {
      setRows(r.items); setTotal(r.total); setLoading(false);
    });
  }, [q, page]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Verification operations"
        title="Landlord verifications"
        description="Identity, business, and ownership verification for landlord accounts — NIN, CAC certificates, utility bills, and tax clearance."
        breadcrumbs={[{ label: "Verification", href: "/admin/verification" }, { label: "Landlords" }]}
      />
      <DemoModeBanner />
      <VerificationCaseTable
        rows={rows} total={total} loading={loading}
        searchValue={q} onSearchChange={(v) => { setQ(v); setPage(1); }}
        page={page} pageSize={pageSize} onPageChange={setPage}
        emptyTitle="No landlord verifications" emptyDescription="Landlord verification cases will appear here when submitted."
      />
    </div>
  );
}
