import Link from "next/link";

interface PropertyQueueItem {
  id: string;
  landlordId: string;
  universityId: string;
  area: string;
  address: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Read-only view of the property review queue.
 *
 * Phase 10 — minimal placeholder. Shows properties awaiting review
 * (status = submitted or under_review). Suspended properties do NOT appear
 * here — they remain at their underlying status (typically approved) and
 * are managed from the property detail page.
 */
export function PropertyQueueView({
  queue,
}: {
  queue: { properties: PropertyQueueItem[]; total: number };
}) {
  if (queue.properties.length === 0) {
    return (
      <p className="rounded-md border border-gray-200 p-6 text-sm text-gray-600">
        No properties awaiting review.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Area</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Description</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Created</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {queue.properties.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-2 font-medium">{p.area}</td>
              <td className="px-4 py-2 text-gray-700">
                {p.description.slice(0, 80)}
                {p.description.length > 80 ? "…" : ""}
              </td>
              <td className="px-4 py-2 capitalize">{p.status.replace(/_/g, " ")}</td>
              <td className="px-4 py-2 text-xs text-gray-500">
                {new Date(p.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-2">
                <Link
                  href={`/admin/properties/${p.id}`}
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
        Showing {queue.properties.length} of {queue.total} properties.
      </p>
    </div>
  );
}
