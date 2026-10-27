"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { VerificationCaseTable } from "@/components/admin/verification-case-table";
import { getRepositories } from "@/lib/repositories";
import type { VerificationListFilters } from "@/lib/repositories/contracts";
import type { VerificationRecord, VerificationStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const STATUS_OPTIONS: { value: "all" | VerificationStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_review", label: "In review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "student_kyc", label: "Student KYC" },
  { value: "landlord_identity", label: "Landlord identity" },
  { value: "landlord_business", label: "Landlord business" },
  { value: "property_listing", label: "Property listing" },
  { value: "room_evidence", label: "Room evidence" },
];

export default function VerificationQueuePage() {
  const [rows, setRows] = React.useState<VerificationRecord[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<"all" | VerificationStatus>("all");
  const [submissionType, setSubmissionType] = React.useState<string>("all");
  const [overdueOnly, setOverdueOnly] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  React.useEffect(() => {
    setLoading(true);
    const filters: VerificationListFilters = {
      q: q || undefined,
      status: status === "all" ? undefined : status,
      submissionType: submissionType === "all" ? undefined : (submissionType as VerificationRecord["submissionType"]),
      overdue: overdueOnly || undefined,
      page,
      pageSize,
    };
    getRepositories()
      .verification.listAll(filters)
      .then((r) => {
        setRows(r.items);
        setTotal(r.total);
        setLoading(false);
      });
  }, [q, status, submissionType, overdueOnly, page]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Verification operations"
        title="Review queue"
        description="All verification submissions across student KYC, landlord identity, property listings, and room evidence."
        breadcrumbs={[{ label: "Verification Officer", href: "/admin/verification" }, { label: "Review queue" }]}
      />

      <DemoModeBanner message="Verification cases shown are fixture data. Approving or rejecting a case updates local state and records a demo audit entry — no real verification is performed." />

      <VerificationCaseTable
        rows={rows}
        total={total}
        loading={loading}
        searchValue={q}
        onSearchChange={(v) => { setQ(v); setPage(1); }}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        filters={
          <>
            <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}>
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={submissionType} onValueChange={(v) => { setSubmissionType(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant={overdueOnly ? "default" : "outline"}
              size="sm"
              className="h-9"
              onClick={() => { setOverdueOnly((v) => !v); setPage(1); }}
            >
              {overdueOnly ? "Showing overdue" : "Show overdue only"}
            </Button>
          </>
        }
      />
    </div>
  );
}
