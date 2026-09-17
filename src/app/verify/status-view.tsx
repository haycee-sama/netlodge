import type { LandlordVerificationStatus } from "@/server/verification";

/**
 * Read-only view of the landlord's current verification status.
 *
 * Phase 4 — minimal placeholder. Visual polish belongs to a later phase.
 */
export function VerificationStatusView({
  status,
}: {
  status: LandlordVerificationStatus;
}) {
  const statusLabel: Record<string, string> = {
    unsubmitted: "Not submitted",
    submitted: "Submitted — awaiting review",
    under_review: "Under review",
    approved: "Approved",
    rejected: "Rejected",
  };

  const statusColor: Record<string, string> = {
    unsubmitted: "text-gray-700",
    submitted: "text-blue-700",
    under_review: "text-blue-700",
    approved: "text-green-700",
    rejected: "text-red-700",
  };

  return (
    <section
      aria-label="Verification status"
      className="rounded-md border border-gray-200 p-6"
    >
      <h2 className="text-lg font-semibold">Current status</h2>
      <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-gray-500">Status</dt>
          <dd className={`font-medium ${statusColor[status.currentVerificationStatus] ?? ""}`}>
            {statusLabel[status.currentVerificationStatus] ?? status.currentVerificationStatus}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Valid until</dt>
          <dd className="font-medium">
            {status.verificationValidUntil
              ? new Date(status.verificationValidUntil).toLocaleDateString()
              : "—"}
          </dd>
        </div>
      </dl>

      {status.latestVerification?.decisionReason ? (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <strong>Rejection reason:</strong>{" "}
          {status.latestVerification.decisionReason}
        </p>
      ) : null}

      {status.latestVerification ? (
        <p className="mt-4 text-xs text-gray-500">
          Last submission:{" "}
          {new Date(status.latestVerification.submittedAt).toLocaleString()}
        </p>
      ) : null}
    </section>
  );
}
