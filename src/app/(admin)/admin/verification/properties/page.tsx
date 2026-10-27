"use client";

import * as React from "react";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { VerificationCaseTable } from "@/components/admin/verification-case-table";
import { getRepositories } from "@/lib/repositories";
import type { VerificationRecord } from "@/lib/types";

export default function VerificationPropertiesPage() {
  const [rows, setRows] = React.useState<VerificationRecord[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  React.useEffect(() => {
    setLoading(true);
    getRepositories().verification.listAll({ entityType: "property", q: q || undefined, page, pageSize }).then((r) => {
      setRows(r.items); setTotal(r.total); setLoading(false);
    });
  }, [q, page]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Verification operations"
        title="Property listing verifications"
        description="Ownership documents, certificates of occupancy, and on-site inspections for new property listings."
        breadcrumbs={[{ label: "Verification", href: "/admin/verification" }, { label: "Properties" }]}
      />
      <DemoModeBanner />
      <VerificationCaseTable
        rows={rows} total={total} loading={loading}
        searchValue={q} onSearchChange={(v) => { setQ(v); setPage(1); }}
        page={page} pageSize={pageSize} onPageChange={setPage}
        emptyTitle="No property verifications" emptyDescription="Property verification cases will appear here when submitted."
      />
    </div>
  );
}
