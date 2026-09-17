import Link from "next/link";
import type { VerificationQueuePage } from "@/server/verification";

/**
 * Read-only view of the verification queue.
 *
 * Phase 4 — minimal placeholder. Visual polish belongs to a later phase.
 */
export function VerificationQueueView({ queue }: { queue: VerificationQueuePage }) {
  if (queue.entries.length === 0) {
    return (
      <p className="rounded-md border border-gray-200 p-6 text-sm text-gray-600">
        No verification submissions in the queue.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-700">
              Landlord
            </th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">
              Status
            </th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">
              Submitted
            </th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">
              Decision
            </th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {queue.entries.map((entry) => (
            <tr key={entry.id}>
              <td className="px-4 py-2">
                <div className="font-medium">{entry.landlordFullName}</div>
                <div className="text-xs text-gray-500">
                  {entry.landlordEmail}
                </div>
              </td>
              <td className="px-4 py-2 capitalize">{entry.status}</td>
              <td className="px-4 py-2">
                {new Date(entry.submittedAt).toLocaleString()}
              </td>
              <td className="px-4 py-2">
                {entry.decision ?? "—"}
              </td>
              <td className="px-4 py-2">
                <Link
                  href={`/admin/verifications/${entry.id}`}
                  className="text-blue-700 hover:underline"
                >
                  Review →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-gray-500">
        Showing {queue.entries.length} of {queue.total} submissions (page{" "}
        {queue.page}).
      </p>
    </div>
  );
}
