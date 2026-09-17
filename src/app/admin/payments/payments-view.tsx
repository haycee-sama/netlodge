import type { AdminListResult, AdminPaymentRow } from "@/lib/admin/schemas";

/**
 * Read-only payments monitor view.
 *
 * Phase 10 — minimal placeholder. Renders payment_transactions including
 * `providerMetadata` (admin-only field per API_CONTRACTS.md §16).
 */
export function PaymentsMonitorView({
  payments,
}: {
  payments: AdminListResult<AdminPaymentRow>;
}) {
  if (payments.items.length === 0) {
    return (
      <p className="rounded-md border border-gray-200 p-6 text-sm text-gray-600">
        No payment transactions found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Reference</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Booking</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Amount (₦)</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Initiated</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Verified</th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">Failure</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {payments.items.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-2 font-mono text-xs">{p.paystackReference}</td>
              <td className="px-4 py-2 font-mono text-xs text-gray-500">{p.bookingId.slice(0, 8)}…</td>
              <td className="px-4 py-2 capitalize">{p.status}</td>
              <td className="px-4 py-2">{(p.amountKobo / 100).toLocaleString()} {p.currency}</td>
              <td className="px-4 py-2 text-xs text-gray-500">
                {new Date(p.initiatedAt).toLocaleString()}
              </td>
              <td className="px-4 py-2 text-xs text-gray-500">
                {p.verifiedAt ? new Date(p.verifiedAt).toLocaleString() : "—"}
              </td>
              <td className="px-4 py-2 text-xs text-red-700">
                {p.failureReason ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-gray-500">
        Showing {payments.items.length} of {payments.totalCount} transactions (page{" "}
        {payments.page}).
      </p>
    </div>
  );
}
