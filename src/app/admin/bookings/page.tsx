import Link from "next/link";
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth";
import { listBookingsAdmin } from "@/server/admin";
import { BookingsMonitorView } from "./bookings-view";

/**
 * Admin bookings monitoring page.
 *
 * Phase 10 — read-only admin view of all bookings across the platform.
 *
 * Route-protected: unauthenticated → /login. Non-admin → /dashboard.
 * The underlying listBookingsAdminCore function ALSO enforces
 * `role === 'admin'` — direct call from a non-admin is denied at the
 * application layer; mutations re-validate at the DB layer via the
 * SECURITY DEFINER RPC functions.
 */
export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/admin/bookings");
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

  let bookings;
  try {
    bookings = await listBookingsAdmin(input);
  } catch {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
        <p className="mt-4 text-red-700">
          Could not load the bookings monitor. Please try again later.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Read-only monitoring of all reservations across the platform.
        </p>
      </header>
      <BookingsMonitorView bookings={bookings} />
      <p className="mt-6 text-xs text-gray-500">
        <Link href="/admin" className="text-blue-700 hover:underline">
          ← Back to admin home
        </Link>
      </p>
    </main>
  );
}
