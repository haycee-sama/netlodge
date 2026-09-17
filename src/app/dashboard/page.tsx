import Link from "next/link";
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth";
import { logout } from "@/server/auth/actions";
import { LogoutButton } from "./logout-button";

/**
 * Wrapper around `logout` for use as a form action — form actions must
 * return void/Promise<void>, but the underlying Server Action returns
 * `{ success: true }` for testability.
 */
async function logoutAction(): Promise<void> {
  await logout();
}

/**
 * Protected dashboard page.
 *
 * Phase 2 — minimal placeholder. The actual marketplace UI (search, listings,
 * bookings, payments, admin) belongs to later phases. This page only proves
 * the authentication boundary:
 *
 *   - Unauthenticated users are redirected to /login.
 *   - Authenticated users see their identity, role, and account status.
 *   - Suspended users CAN see this page (per TECHNICAL_ARCHITECTURE.md §6)
 *     but cannot perform state-changing actions elsewhere.
 *
 * IMPORTANT: route protection happens here, server-side, NOT in middleware.
 * Middleware only refreshes the session — it does not enforce auth. Every
 * protected page independently re-checks auth via `getCurrentSession()`.
 */
export default async function DashboardPage() {
  const user = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  return (
    <main
      id="main-content"
      className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8"
    >
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Phase 2 placeholder — marketplace UI arrives in later phases.
        </p>
      </header>

      <section
        aria-label="Account summary"
        className="space-y-4 rounded-md border border-gray-200 p-6"
      >
        <h2 className="text-lg font-semibold">Account</h2>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Email verified</dt>
            <dd className="font-medium">
              {user.emailVerified ? "Yes" : "Pending"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Full name</dt>
            <dd className="font-medium">{user.profile.fullName}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Phone</dt>
            <dd className="font-medium">{user.profile.phone}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Role</dt>
            <dd className="font-medium capitalize">{user.profile.role}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Account status</dt>
            <dd className="font-medium">
              {user.profile.accountStatus === "active" ? (
                <span className="text-green-700">Active</span>
              ) : (
                <span className="text-red-700">Suspended</span>
              )}
            </dd>
          </div>
        </dl>

        {user.profile.accountStatus === "suspended" ? (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            Your account is suspended. You can view this dashboard but
            cannot perform any state-changing actions (e.g., creating
            bookings, listing properties).{" "}
            {user.profile.suspensionReason
              ? `Reason: ${user.profile.suspensionReason}. `
              : ""}
            Contact support if you believe this is an error.
          </p>
        ) : null}
      </section>

      <section
        aria-label="Account actions"
        className="mt-8 flex flex-wrap gap-4"
      >
        <Link
          href="/account"
          className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Edit profile
        </Link>
        <form action={logoutAction}>
          <LogoutButton />
        </form>
      </section>
    </main>
  );
}
