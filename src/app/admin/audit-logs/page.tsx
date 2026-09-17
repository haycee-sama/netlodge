import Link from "next/link";
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth";
import { listAuditLogs } from "@/server/audit";
import { AuditLogView } from "./audit-view";

/**
 * Admin audit-log viewer.
 *
 * Phase 10 — read-only admin view of the append-only audit log.
 *
 * Per API_CONTRACTS.md §17: read-only, filterable by entityType/entityId/
 * actorId/date range. There is NO create/update/delete contract for audit
 * logs anywhere — every audit row is written internally by the SECURITY
 * DEFINER admin mutation functions inside their atomic transaction.
 *
 * Route-protected: unauthenticated → /login. Non-admin → /dashboard.
 */
export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/admin/audit-logs");
  }
  if (user.profile.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const input: Record<string, unknown> = { page: 1, pageSize: 50 };
  const pickStr = (key: string): string | undefined => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
  if (pickStr("entityType")) {
    input.entityType = pickStr("entityType");
  }
  if (pickStr("entityId")) {
    input.entityId = pickStr("entityId");
  }
  if (pickStr("actorId")) {
    input.actorId = pickStr("actorId");
  }

  let logs;
  try {
    logs = await listAuditLogs(input);
  } catch {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Audit logs</h1>
        <p className="mt-4 text-red-700">
          Could not load audit logs. Please try again later.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Audit logs</h1>
        <p className="mt-2 text-sm text-gray-600">
          Append-only record of every security-sensitive admin action. Read-only —
          audit rows can be created only by the atomic admin mutation functions, and
          never updated or deleted through the application surface.
        </p>
      </header>
      <AuditLogView logs={logs} />
      <p className="mt-6 text-xs text-gray-500">
        <Link href="/admin" className="text-blue-700 hover:underline">
          ← Back to admin home
        </Link>
      </p>
    </main>
  );
}
