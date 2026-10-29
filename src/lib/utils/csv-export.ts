"use client";

import type { LandlordPaymentWithRelations } from "@/lib/supabase/payment-service";
import { formatNgn, formatDateTime } from "@/lib/utils/format";

/**
 * Exports landlord payments to a CSV file and triggers a browser download.
 *
 * The CSV is generated client-side from the actual payment data already
 * loaded in the page. No server roundtrip needed — the data is real.
 */
export function exportPaymentsCsv(payments: LandlordPaymentWithRelations[]): void {
  if (payments.length === 0) return;

  const headers = [
    "Reference",
    "Status",
    "Amount (kobo)",
    "Amount (NGN)",
    "Fee (kobo)",
    "Net (kobo)",
    "Channel",
    "Currency",
    "Initiated At",
    "Gateway Reference",
    "Confirmed By Backend",
    "Failure Reason",
    "Booking Reference",
    "Property Name",
  ];

  const rows = payments.map((p) => {
    const booking = p.bookings;
    return [
      p.reference,
      p.status,
      String(p.amount_kobo),
      formatNgn(p.amount_kobo),
      String(p.fee_kobo),
      String(p.net_kobo),
      p.channel,
      p.currency,
      formatDateTime(p.initiated_at),
      p.gateway_reference ?? "",
      p.confirmed_by_backend ? "Yes" : "No",
      p.failure_reason ?? "",
      booking?.reference ?? "",
      booking?.properties?.name ?? "",
    ];
  });

  // Build CSV with proper escaping (wrap fields containing commas/quotes in quotes)
  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((field) => {
          const str = String(field);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(","),
    )
    .join("\n");

  // Add BOM for Excel UTF-8 compatibility
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `netlodge-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
