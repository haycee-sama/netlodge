import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
import { getCurrentSession } from "@/server/auth";
import { getOwnVerificationStatus, submitVerification } from "@/server/verification";
import { SubmitVerificationForm } from "./submit-form";
import { VerificationStatusView } from "./status-view";

/**
 * Landlord verification page.
 *
 * Phase 4 — minimal placeholder UI. Shows:
 *   - Current verification status (unsubmitted / submitted / under_review / approved / rejected).
 *   - Rejection reason if the latest submission was rejected.
 *   - Submit-verification form (calls the `submitVerification` Server Action).
 *
 * Route-protected: unauthenticated users redirect to /login. Non-landlords
 * (students/admins) see a "not available" message — they don't have a
 * landlord verification flow.
 */
export default async function VerifyPage() {
  const user = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/verify");
  }

  if (user.profile.role !== "landlord") {
    return (
      <main
        id="main-content"
        className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <h1 className="text-3xl font-bold tracking-tight">Verification</h1>
        <p className="mt-4 text-gray-600">
          Landlord verification is only available for landlord accounts.
          Your account role is{" "}
          <span className="font-medium capitalize">
            {user.profile.role}
          </span>
          .
        </p>
      </main>
    );
  }

  // Fetch the landlord's current verification status.
  let status;
  try {
    status = await getOwnVerificationStatus();
  } catch {
    // If the status lookup fails, show a friendly error — don't crash.
    return (
      <main
        id="main-content"
        className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <h1 className="text-3xl font-bold tracking-tight">Verification</h1>
        <p className="mt-4 text-red-700">
          Could not load your verification status. Please try again later.
        </p>
      </main>
    );
  }

  const canSubmit =
    status.currentVerificationStatus === "unsubmitted" ||
    status.currentVerificationStatus === "rejected";

  return (
    <main
      id="main-content"
      className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8"
    >
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Landlord verification
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Submit your government-issued ID and ownership evidence for admin
          review. Verification is required before you can list properties.
        </p>
      </header>

      <VerificationStatusView status={status} />

      {canSubmit ? (
        <section
          aria-label="Submit verification"
          className="mt-8 rounded-md border border-gray-200 p-6"
        >
          <h2 className="text-lg font-semibold">
            {status.currentVerificationStatus === "rejected"
              ? "Resubmit verification"
              : "Submit verification"}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Upload your ID document and ownership evidence. Each file is
            validated server-side before being stored in our private
            verification-documents bucket.
          </p>
          <SubmitVerificationForm action={submitVerification} />
        </section>
      ) : (
        <section className="mt-8 rounded-md border border-gray-200 p-6">
          <h2 className="text-lg font-semibold">Submission locked</h2>
          <p className="mt-1 text-sm text-gray-600">
            Your verification is currently{" "}
            <span className="font-medium">
              {status.currentVerificationStatus}
            </span>
            . You cannot submit a new verification until the current one is
            decided.
          </p>
        </section>
      )}
    </main>
  );
}
