"use client";

import * as React from "react";
import {
  ShieldCheck,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

/**
 * Tier 2 KYC submission page for landlords.
 *
 * Landlords upload up to three pieces of evidence:
 *   1. government_id     — Government-issued ID (driver's license, voter's
 *                          card, international passport, or national ID card)
 *   2. proof_of_address  — Utility bill, bank statement, or official letter
 *                          dated within the last 3 months
 *   3. cac               — OPTIONAL: Corporate Affairs Commission certificate
 *                          (only if the landlord operates as a registered
 *                          business)
 *
 * Tier 2 is considered complete only when both `government_id` and
 * `proof_of_address` are approved. CAC is optional and does not block
 * Tier 2 completion.
 *
 * Files are uploaded to the private `verification-evidence` Supabase
 * Storage bucket and a `kyc_verifications` row is inserted per document.
 * Existing rows are fetched on mount so the landlord can see the current
 * review status (pending / approved / rejected) of each document.
 */

type KycDocType = "government_id" | "proof_of_address" | "cac";

type KycStatus = "pending" | "approved" | "rejected";

interface KycRecord {
  id: string;
  status: KycStatus;
  document_url: string | null;
  document_number: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface UploadState {
  file: File | null;
  previewUrl: string | null;
  uploading: boolean;
}

const DOC_LABELS: Record<
  KycDocType,
  {
    title: string;
    hint: string;
    fileLabel: string;
    cta: string;
    optional?: boolean;
  }
> = {
  government_id: {
    title: "Government-issued ID",
    hint: "Upload a clear, well-lit photo of your driver's license, voter's card, international passport, or national ID card. All four corners should be visible.",
    fileLabel: "Government-issued ID photo *",
    cta: "Submit ID",
  },
  proof_of_address: {
    title: "Proof of address",
    hint: "Upload a utility bill, bank statement, or official letter dated within the last 3 months. Your name and address must be clearly visible.",
    fileLabel: "Proof of address photo *",
    cta: "Submit proof of address",
  },
  cac: {
    title: "CAC registration",
    hint: "Optional. Only required if you operate as a registered business. Upload your Corporate Affairs Commission certificate.",
    fileLabel: "CAC certificate photo",
    cta: "Submit CAC certificate",
    optional: true,
  },
};

const STATUS_BADGE: Record<
  KycStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Under review",
    className:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  approved: {
    label: "Approved",
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  },
  rejected: {
    label: "Rejected",
    className:
      "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  },
};

export default function LandlordKycPage() {
  const { session } = useAuth();
  const supabaseRef = React.useRef<ReturnType<typeof createClient> | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [records, setRecords] = React.useState<
    Record<KycDocType, KycRecord | null>
  >({
    government_id: null,
    proof_of_address: null,
    cac: null,
  });
  const [governmentIdUpload, setGovernmentIdUpload] =
    React.useState<UploadState>({
      file: null,
      previewUrl: null,
      uploading: false,
    });
  const [proofOfAddressUpload, setProofOfAddressUpload] =
    React.useState<UploadState>({
      file: null,
      previewUrl: null,
      uploading: false,
    });
  const [cacUpload, setCacUpload] = React.useState<UploadState>({
    file: null,
    previewUrl: null,
    uploading: false,
  });

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }

  // Fetch existing KYC records for this user on mount.
  React.useEffect(() => {
    if (!session?.userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function fetchRecords() {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("kyc_verifications")
          .select(
            "id, status, document_type, document_url, document_number, rejection_reason, reviewed_at, created_at",
          )
          .eq("user_id", session!.userId)
          .eq("tier", 2)
          .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);
        if (cancelled) return;

        const latest: Record<KycDocType, KycRecord | null> = {
          government_id: null,
          proof_of_address: null,
          cac: null,
        };
        for (const row of data ?? []) {
          const docType = row.document_type as KycDocType;
          if (
            docType !== "government_id" &&
            docType !== "proof_of_address" &&
            docType !== "cac"
          )
            continue;
          // Rows are ordered by created_at desc, so the first match per
          // doc type is the most recent submission.
          if (!latest[docType]) {
            latest[docType] = {
              id: row.id,
              status: row.status as KycStatus,
              document_url: row.document_url,
              document_number: row.document_number,
              rejection_reason: row.rejection_reason,
              reviewed_at: row.reviewed_at,
              created_at: row.created_at,
            };
          }
        }
        setRecords(latest);
      } catch (e) {
        if (cancelled) return;
        toast.error("Could not load verification status", {
          description: e instanceof Error ? e.message : "Please try again.",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRecords();
    return () => {
      cancelled = true;
    };
  }, [session?.userId]);

  // Revoke preview object URLs on unmount to avoid memory leaks.
  React.useEffect(() => {
    return () => {
      if (governmentIdUpload.previewUrl)
        URL.revokeObjectURL(governmentIdUpload.previewUrl);
      if (proofOfAddressUpload.previewUrl)
        URL.revokeObjectURL(proofOfAddressUpload.previewUrl);
      if (cacUpload.previewUrl) URL.revokeObjectURL(cacUpload.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tier 2 is complete only when both required documents are approved.
  // CAC is optional and never blocks Tier 2 completion.
  const tierTwoComplete =
    records.government_id?.status === "approved" &&
    records.proof_of_address?.status === "approved";

  function handleFileSelect(
    docType: KycDocType,
    file: File | undefined,
    setter: React.Dispatch<React.SetStateAction<UploadState>>,
  ) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image is too large", {
        description: "Please choose a file smaller than 8 MB.",
      });
      return;
    }
    setter((prev) => {
      if (prev.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return {
        file,
        previewUrl: URL.createObjectURL(file),
        uploading: false,
      };
    });
    void docType;
  }

  async function uploadDocument(
    docType: KycDocType,
    upload: UploadState,
    setter: React.Dispatch<React.SetStateAction<UploadState>>,
  ) {
    if (!session?.userId) {
      toast.error("You must be signed in to upload documents");
      return;
    }
    if (!upload.file) {
      toast.error("Choose an image first");
      return;
    }

    setter((prev) => ({ ...prev, uploading: true }));

    try {
      const supabase = getSupabase();
      const timestamp = Date.now();
      const filePath = `kyc/${session.userId}/${docType}-${timestamp}.jpg`;

      // 1. Upload the file to the private verification-evidence bucket.
      const { error: uploadError } = await supabase.storage
        .from("verification-evidence")
        .upload(filePath, upload.file, {
          cacheControl: "3600",
          upsert: false,
          contentType: upload.file.type || "image/jpeg",
        });

      if (uploadError) throw new Error(uploadError.message);

      // Build the public URL path (bucket is private, but storing the path
      // lets admins/RLS-allowed reviewers fetch it later).
      const { data: urlData } = supabase.storage
        .from("verification-evidence")
        .getPublicUrl(filePath);

      const documentUrl = urlData?.publicUrl ?? filePath;

      // 2. Insert a new kyc_verifications row.
      const { data: inserted, error: insertError } = await supabase
        .from("kyc_verifications")
        .insert({
          user_id: session.userId,
          tier: 2,
          status: "pending",
          document_type: docType,
          document_url: documentUrl,
          document_number: null,
        })
        .select(
          "id, status, document_url, document_number, rejection_reason, reviewed_at, created_at",
        )
        .single();

      if (insertError) throw new Error(insertError.message);

      const newRecord: KycRecord = {
        id: inserted.id,
        status: inserted.status as KycStatus,
        document_url: inserted.document_url,
        document_number: inserted.document_number,
        rejection_reason: inserted.rejection_reason,
        reviewed_at: inserted.reviewed_at,
        created_at: inserted.created_at,
      };

      setRecords((prev) => ({ ...prev, [docType]: newRecord }));

      // Reset the upload state for this doc (clear preview + file).
      setter((prev) => {
        if (prev.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return { file: null, previewUrl: null, uploading: false };
      });

      toast.success("Document submitted", {
        description: `${DOC_LABELS[docType].title} is now under review. We'll notify you once it's checked.`,
      });
    } catch (e) {
      setter((prev) => ({ ...prev, uploading: false }));
      toast.error("Upload failed", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Tier 2 KYC"
        title="Verify your identity"
        description="Submit your government-issued ID and proof of address so students can trust your listings. Verification usually takes 1–2 business days."
        actions={
          tierTwoComplete ? (
            <Badge
              className={
                "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
              }
            >
              <ShieldCheck className="h-3 w-3" aria-hidden /> KYC verified ✓
            </Badge>
          ) : null
        }
      />

      {/* Overall status banner */}
      {tierTwoComplete ? (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/40">
          <CardContent className="flex items-start gap-3 py-5">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <p className="font-display text-base font-semibold text-emerald-900 dark:text-emerald-100">
                Your identity is verified
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 text-pretty">
                Both required documents have been approved. You can now list and
                operate properties with full Tier 2 verification status.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/40">
          <CardContent className="flex items-start gap-3 py-5">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              <AlertCircle className="h-5 w-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <p className="font-display text-base font-semibold text-amber-900 dark:text-amber-100">
                Tier 2 verification required
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 text-pretty">
                Upload your government-issued ID and proof of address below to unlock
                verified-landlord status. CAC registration is optional and only needed
                if you operate as a registered business.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <UploadSection
        docType="government_id"
        record={records.government_id}
        upload={governmentIdUpload}
        onFile={(file) =>
          handleFileSelect("government_id", file, setGovernmentIdUpload)
        }
        onUpload={() =>
          uploadDocument("government_id", governmentIdUpload, setGovernmentIdUpload)
        }
      />

      <UploadSection
        docType="proof_of_address"
        record={records.proof_of_address}
        upload={proofOfAddressUpload}
        onFile={(file) =>
          handleFileSelect("proof_of_address", file, setProofOfAddressUpload)
        }
        onUpload={() =>
          uploadDocument(
            "proof_of_address",
            proofOfAddressUpload,
            setProofOfAddressUpload,
          )
        }
      />

      <UploadSection
        docType="cac"
        record={records.cac}
        upload={cacUpload}
        onFile={(file) => handleFileSelect("cac", file, setCacUpload)}
        onUpload={() => uploadDocument("cac", cacUpload, setCacUpload)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Upload section sub-component (kept in this file to avoid creating  */
/* extra files — the spec asked for one new file).                    */
/* ------------------------------------------------------------------ */

interface UploadSectionProps {
  docType: KycDocType;
  record: KycRecord | null;
  upload: UploadState;
  onFile: (file: File | undefined) => void;
  onUpload: () => void;
}

function UploadSection({
  docType,
  record,
  upload,
  onFile,
  onUpload,
}: UploadSectionProps) {
  const { title, hint, fileLabel, cta, optional } = DOC_LABELS[docType];
  const status = record?.status;
  const canReUpload =
    status === "rejected" || status === undefined || status === null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" aria-hidden />
            {title}
            {optional ? (
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            ) : null}
          </CardTitle>
          {status && (
            <Badge className={STATUS_BADGE[status].className}>
              {STATUS_BADGE[status].label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground text-pretty">{hint}</p>

        {/* Rejection reason */}
        {status === "rejected" && record?.rejection_reason && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">
            <p className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden /> Submission rejected
            </p>
            <p className="mt-1 text-pretty">{record.rejection_reason}</p>
            <p className="mt-1.5 text-red-600/80 dark:text-red-400/80">
              Please upload a new photo and submit again.
            </p>
          </div>
        )}

        {/* Previous submission note */}
        {status === "pending" && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
            <p className="flex items-center gap-1.5 font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Under review
            </p>
            <p className="mt-1">
              Submitted on{" "}
              {record?.created_at
                ? new Date(record.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "recently"}
              . You&apos;ll be notified once it&apos;s approved.
            </p>
          </div>
        )}

        {status === "approved" && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
            <p className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Approved
            </p>
            <p className="mt-1">{title} verified.</p>
          </div>
        )}

        {/* File input + preview */}
        {canReUpload ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${docType}-file`}>{fileLabel}</Label>
              <Input
                id={`${docType}-file`}
                type="file"
                accept="image/*"
                onChange={(e) => onFile(e.target.files?.[0] ?? undefined)}
              />
            </div>

            {upload.previewUrl && (
              <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={upload.previewUrl}
                  alt={`${title} preview`}
                  className="h-20 w-20 rounded-md border border-border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{upload.file?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {upload.file
                      ? `${(upload.file.size / 1024 / 1024).toFixed(2)} MB`
                      : ""}
                  </p>
                </div>
              </div>
            )}

            <Button
              type="button"
              onClick={onUpload}
              disabled={upload.uploading || !upload.file}
            >
              {upload.uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Uploading…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" aria-hidden /> {cta}
                </>
              )}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
