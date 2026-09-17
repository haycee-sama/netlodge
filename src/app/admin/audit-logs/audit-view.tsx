import type { AdminListResult, AdminAuditLogRow } from "@/lib/admin/schemas";

/**
 * Read-only audit-log viewer.
 *
 * Phase 10 — minimal placeholder. Append-only by design — no edit/delete
 * controls exist in this UI or anywhere else.
 */
export function AuditLogView({
  logs,
}: {
  logs: AdminListResult<AdminAuditLogRow>;
}) {
  if (logs.items.length === 0) {
    return (
      <p className="rounded-md border border-gray-200 p-6 text-sm text-gray-600">
        No audit log entries found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-700">When</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Actor</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Action</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Entity</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {logs.items.map((log) => (
            <tr key={log.id}>
              <td className="px-4 py-2 text-xs text-gray-500">
                {new Date(log.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-2 font-mono text-xs text-gray-500">
                {log.actorId ? `${log.actorId.slice(0, 8)}…` : "system"}
              </td>
              <td className="px-4 py-2 font-mono text-xs">{log.action}</td>
              <td className="px-4 py-2 font-mono text-xs">
                <span className="text-gray-700">{log.entityType}</span>
                <span className="text-gray-400"> / </span>
                <span className="text-gray-500">{log.entityId.slice(0, 8)}…</span>
              </td>
              <td className="px-4 py-2 text-xs text-gray-600">
                {log.reason ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-gray-500">
        Showing {logs.items.length} of {logs.totalCount} entries (page{" "}
        {logs.page}).
      </p>
    </div>
  );
}
