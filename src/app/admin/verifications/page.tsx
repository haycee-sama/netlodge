import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
import { getCurrentSession } from "@/server/auth";
import { getVerificationQueue } from "@/server/verification";
import { VerificationQueueView } from "./queue-view";

/**
 * Admin verification queue page.
 *
 * Phase 4 — minimal placeholder. Lists pending verification submissions.
 * Clicking a row opens the review page (/admin/verifications/[id]).
 *
 * Route-protected: unauthenticated → /login. Non-admin → /dashboard.
 */
export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/admin/verifications");
  }
  if (user.profile.role !== "admin") {
    redirect("/dashboard");
  }

  // Parse optional status filter from query params.
  const params = await searchParams;
  const statusParam = Array.isArray(params.status)
    ? params.status[0]
    : params.status;
  const input: Record<string, unknown> = {};
  if (statusParam) {
    input.status = statusParam;
  }

  let queue;
  try {
    queue = await getVerificationQueue(input);
  } catch {
    return (
      <main
        id="main-content"
        className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <h1 className="text-3xl font-bold tracking-tight">
          Verification queue
        </h1>
        <p className="mt-4 text-red-700">
          Could not load the verification queue. Please try again later.
        </p>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8"
    >
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Verification queue
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Review landlord verification submissions. Click a row to view
          details and approve / reject.
        </p>
      </header>

      <VerificationQueueView queue={queue} />
    </main>
  );
}
