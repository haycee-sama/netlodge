"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AdminDataTable, type Column } from "@/components/admin/admin-data-table";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { PropertyStatusBadge, VerificationBadge } from "@/components/shared/status-badges";
import { Badge } from "@/components/ui/badge";
import { properties as allProperties, rooms as allRooms } from "@/lib/data/fixtures";
import { users as allUsers } from "@/lib/data/admin-fixtures";
import type { Property } from "@/lib/types";
import { formatRelativeTime, formatNgn } from "@/lib/utils/format";

export default function AdminPropertiesPage() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  const filtered = q
    ? allProperties.filter((p) => `${p.name} ${p.publicAddressLine} ${p.city}`.toLowerCase().includes(q.toLowerCase()))
    : allProperties;
  const total = filtered.length;
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: Column<Property>[] = [
    { key: "name", header: "Property", cell: (p) => <div><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.publicAddressLine}</p></div> },
    { key: "landlord", header: "Landlord", cell: (p) => { const u = allUsers.find((u) => u.id === p.landlordId); return <span className="text-xs">{u ? `${u.firstName} ${u.lastName}` : p.landlordId}</span>; } },
    { key: "status", header: "Status", cell: (p) => <PropertyStatusBadge status={p.status} /> },
    { key: "verification", header: "Verification", cell: (p) => <VerificationBadge status={p.verificationStatus} /> },
    { key: "totalUnits", header: "Units", cell: (p) => <span className="text-xs">{p.totalUnits} ({p.availableUnits} avail)</span> },
    { key: "priceFromKobo", header: "From", cell: (p) => <span className="text-xs">{formatNgn(p.priceFromKobo)}</span> },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Marketplace oversight"
        title="Properties"
        description="Platform-wide view of all listed properties. Click a row to inspect."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Properties" }]}
      />
      <DemoModeBanner />
      <AdminDataTable
        columns={columns}
        rows={rows}
        total={total}
        loading={false}
        searchValue={q}
        onSearchChange={(v) => { setQ(v); setPage(1); }}
        searchPlaceholder="Search by name or address…"
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onRowClick={(p) => router.push(`/properties/${p.slug}`)}
        getRowId={(p) => p.id}
        emptyTitle="No properties"
      />
    </div>
  );
}
