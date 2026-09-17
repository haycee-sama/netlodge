import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
import { getCurrentSession } from "@/server/auth";
import { approveVerification, rejectVerification } from "@/server/verification";
import { ReviewForm } from "./review-form";

/**
 * Admin verification review page.
 *
 * Phase 4 — minimal placeholder. Shows the submission details + an
 * approve/reject form. The form calls the respective Server Actions
 * (passed as props — client components cannot directly import server-only
 * modules).
 *
 * Route-protected: unauthenticated → /login. Non-admin → /dashboard.
 */
export default async function AdminVerificationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/admin/verifications");
  }
  if (user.profile.role !== "admin") {
    redirect("/dashboard");
  }

  const { id } = await params;

  return (
    <main
      id="main-content"
      className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8"
    >
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Review verification
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Submission ID: <code className="text-xs">{id}</code>
        </p>
      </header>

      <ReviewForm
        verificationId={id}
        approveAction={approveVerification}
        rejectAction={rejectVerification}
      />
    </main>
  );
}
