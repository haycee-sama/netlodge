import type { AdminListResult, AdminBookingRow } from "@/lib/admin/schemas";

/**
 * Read-only bookings monitor view.
 *
 * Phase 10 — minimal placeholder. The server action call already enforced
 * admin authorization; this component renders the data.
 */
export function BookingsMonitorView({
  bookings,
}: {
  bookings: AdminListResult<AdminBookingRow>;
}) {
  if (bookings.items.length === 0) {
    return (
      <p className="rounded-md border border-gray-200 p-6 text-sm text-gray-600">
        No bookings found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-700">ID</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Room</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Property</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Student</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Reserved (₦)</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {bookings.items.map((b) => (
            <tr key={b.id}>
              <td className="px-4 py-2 font-mono text-xs text-gray-500">{b.id.slice(0, 8)}…</td>
              <td className="px-4 py-2 font-mono text-xs text-gray-500">{b.roomId.slice(0, 8)}…</td>
              <td className="px-4 py-2 font-mono text-xs text-gray-500">{b.propertyId.slice(0, 8)}…</td>
              <td className="px-4 py-2 font-mono text-xs text-gray-500">{b.studentId.slice(0, 8)}…</td>
              <td className="px-4 py-2 capitalize">{b.status.replace(/_/g, " ")}</td>
              <td className="px-4 py-2">
                {(b.reservedPriceKobo / 100).toLocaleString()}
              </td>
              <td className="px-4 py-2 text-xs text-gray-500">
                {new Date(b.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-gray-500">
        Showing {bookings.items.length} of {bookings.totalCount} bookings (page{" "}
        {bookings.page}).
      </p>
    </div>
  );
}
