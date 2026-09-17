import Link from "next/link";
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth";
import { getPropertyQueue } from "@/server/properties";
import { PropertyQueueView } from "./properties-view";

/**
 * Admin property review queue page.
 *
 * Phase 10 — read-only queue view. Click a row to open the review page
 * (/admin/properties/[id]) where approve/reject/suspend/lift-suspension
 * controls live.
 *
 * Route-protected: unauthenticated → /login. Non-admin → /dashboard.
 */
export default async function AdminPropertiesPage() {
  const user = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/admin/properties");
  }
  if (user.profile.role !== "admin") {
    redirect("/dashboard");
  }

  let queue;
  try {
    queue = await getPropertyQueue();
  } catch {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
        <p className="mt-4 text-red-700">
          Could not load the property queue. Please try again later.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
        <p className="mt-2 text-sm text-gray-600">
          Properties awaiting review (status: submitted or under_review). Click a
          row to approve, reject, suspend, or lift suspension.
        </p>
      </header>
      <PropertyQueueView queue={queue} />
      <p className="mt-6 text-xs text-gray-500">
        <Link href="/admin" className="text-blue-700 hover:underline">
          ← Back to admin home
        </Link>
      </p>
    </main>
  );
}
