import Link from "next/link";
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth";
import { listReportsAdmin } from "@/server/reports";
import { ReportsQueueView } from "./reports-view";

/**
 * Admin reports queue — Phase 11.
 *
 * Read-only list of all filed reports. Admin can mark under_review or
 * resolve from this page.
 *
 * Route-protected: unauthenticated → /login. Non-admin → /dashboard.
 */
export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/admin/reports");
  }
  if (user.profile.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const input: Record<string, unknown> = { page: 1, pageSize: 50 };
  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status;
  if (statusParam) {
    input.status = statusParam;
  }

  let reports;
  try {
    reports = await listReportsAdmin(input);
  } catch {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="mt-4 text-red-700">
          Could not load the reports queue. Please try again later.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="mt-2 text-sm text-gray-600">
          Reports filed by students and landlords. Defaults to non-resolved.
        </p>
      </header>
      <ReportsQueueView reports={reports} />
      <p className="mt-6 text-xs text-gray-500">
        <Link href="/admin" className="text-blue-700 hover:underline">
          ← Back to admin home
        </Link>
      </p>
    </main>
  );
}
