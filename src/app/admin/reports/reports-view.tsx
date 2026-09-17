import type { ReportListResult } from "@/lib/reports/schemas";

/**
 * Read-only reports queue view.
 *
 * Phase 11 — minimal placeholder. Shows all reports (default: non-resolved).
 */
export function ReportsQueueView({
  reports,
}: {
  reports: ReportListResult;
}) {
  if (reports.items.length === 0) {
    return (
      <p className="rounded-md border border-gray-200 p-6 text-sm text-gray-600">
        No reports found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Target</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Category</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Description</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Filed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {reports.items.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-2 capitalize">
                <span
                  className={
                    r.status === "resolved"
                      ? "rounded-full bg-green-100 px-2 py-1 text-xs text-green-800"
                      : r.status === "under_review"
                        ? "rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800"
                        : "rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800"
                  }
                >
                  {r.status.replace(/_/g, " ")}
                </span>
              </td>
              <td className="px-4 py-2 font-mono text-xs">
                <span className="text-gray-700">{r.targetType}</span>
                <span className="text-gray-400"> / </span>
                <span className="text-gray-500">{r.targetId.slice(0, 8)}…</span>
              </td>
              <td className="px-4 py-2">{r.reasonCategory}</td>
              <td className="px-4 py-2 text-xs text-gray-600">
                {r.description ? r.description.slice(0, 80) : "—"}
              </td>
              <td className="px-4 py-2 text-xs text-gray-500">
                {new Date(r.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-gray-500">
        Showing {reports.items.length} of {reports.totalCount} reports (page{" "}
        {reports.page}).
      </p>
    </div>
  );
}
