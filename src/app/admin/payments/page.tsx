import Link from "next/link";
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth";
import { listPaymentsAdmin } from "@/server/admin";
import { PaymentsMonitorView } from "./payments-view";

/**
 * Admin payments monitoring page.
 *
 * Phase 10 — read-only admin view of all payment_transactions including
 * `provider_metadata` (admin-only field per API_CONTRACTS.md §16).
 *
 * Route-protected: unauthenticated → /login. Non-admin → /dashboard.
 */
export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/admin/payments");
  }
  if (user.profile.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const input: Record<string, unknown> = { page: 1, pageSize: 20 };
  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status;
  if (statusParam) {
    input.status = statusParam;
  }

  let payments;
  try {
    payments = await listPaymentsAdmin(input);
  } catch {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="mt-4 text-red-700">
          Could not load the payments monitor. Please try again later.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="mt-2 text-sm text-gray-600">
          Read-only monitoring of all payment transactions. Provider metadata
          is admin-only.
        </p>
      </header>
      <PaymentsMonitorView payments={payments} />
      <p className="mt-6 text-xs text-gray-500">
        <Link href="/admin" className="text-blue-700 hover:underline">
          ← Back to admin home
        </Link>
      </p>
    </main>
  );
}
