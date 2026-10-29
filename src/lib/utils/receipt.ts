"use client";

import * as React from "react";
import type { PaymentWithBooking } from "@/lib/supabase/payment-service";
import { formatNgn, formatDateTime } from "@/lib/utils/format";

/**
 * Generates a printable receipt for a payment and opens it in a new window.
 *
 * The receipt is a self-contained HTML document with inline styles — no
 * external dependencies. The user can print it to PDF via the browser's
 * print dialog (Ctrl+P / Cmd+P).
 *
 * This is a real receipt: it uses the actual payment data from the
 * database (amount, reference, dates, booking details). No fabricated
 * values.
 */
export function downloadPaymentReceipt(p: PaymentWithBooking): void {
  const booking = p.bookings;
  const receiptHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Receipt ${p.reference}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1a1a1a; background: #f5f5f5; padding: 24px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .receipt {
    max-width: 640px; margin: 0 auto; background: #fff;
    border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .header {
    background: #4f46e5; color: #fff; padding: 24px 32px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .header h1 { font-size: 20px; font-weight: 700; }
  .header .brand { font-size: 14px; opacity: 0.9; }
  .body { padding: 32px; }
  .row {
    display: flex; justify-content: space-between; padding: 10px 0;
    border-bottom: 1px solid #eee; font-size: 14px;
  }
  .row:last-child { border-bottom: none; }
  .label { color: #666; }
  .value { font-weight: 500; }
  .section-title {
    font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;
    color: #999; margin: 24px 0 8px; font-weight: 600;
  }
  .total {
    background: #f0fdf4; border-radius: 8px; padding: 16px;
    margin-top: 16px; display: flex; justify-content: space-between;
    align-items: center;
  }
  .total .amount { font-size: 24px; font-weight: 700; color: #15803d; }
  .status-badge {
    display: inline-block; padding: 4px 10px; border-radius: 4px;
    font-size: 12px; font-weight: 600; text-transform: uppercase;
  }
  .status-successful { background: #dcfce7; color: #15803d; }
  .status-failed { background: #fee2e2; color: #b91c1c; }
  .status-pending, .status-initiated { background: #fef3c7; color: #b45309; }
  .footer {
    padding: 16px 32px; background: #f9fafb; text-align: center;
    font-size: 12px; color: #999; border-top: 1px solid #eee;
  }
  @media print { body { padding: 0; background: #fff; } .receipt { box-shadow: none; } }
</style>
</head>
<body>
<div class="receipt">
  <div class="header">
    <div>
      <h1>Payment Receipt</h1>
      <p class="brand">NetLodge — Student Accommodation</p>
    </div>
    <span class="status-badge status-${p.status}">${p.status}</span>
  </div>
  <div class="body">
    <div class="section-title">Payment details</div>
    <div class="row"><span class="label">Reference</span><span class="value">${p.reference}</span></div>
    <div class="row"><span class="label">Date</span><span class="value">${formatDateTime(p.initiated_at)}</span></div>
    <div class="row"><span class="label">Channel</span><span class="value">${p.channel.toUpperCase()}</span></div>
    <div class="row"><span class="label">Currency</span><span class="value">${p.currency}</span></div>
    ${p.gateway_reference ? `<div class="row"><span class="label">Gateway reference</span><span class="value">${p.gateway_reference}</span></div>` : ""}
    ${p.confirmed_by_backend ? `<div class="row"><span class="label">Backend verified</span><span class="value">Yes</span></div>` : ""}

    ${booking ? `
    <div class="section-title">Booking</div>
    <div class="row"><span class="label">Booking reference</span><span class="value">${booking.reference}</span></div>
    ${booking.properties ? `<div class="row"><span class="label">Property</span><span class="value">${booking.properties.name}</span></div>` : ""}
    ` : ""}

    <div class="section-title">Amount breakdown</div>
    <div class="row"><span class="label">Amount</span><span class="value">${formatNgn(p.amount_kobo)}</span></div>
    <div class="row"><span class="label">Payment gateway fee</span><span class="value">${formatNgn(p.fee_kobo)}</span></div>
    <div class="row"><span class="label">Net amount</span><span class="value">${formatNgn(p.net_kobo)}</span></div>

    <div class="total">
      <span class="label" style="font-weight:600;">Total paid</span>
      <span class="amount">${formatNgn(p.amount_kobo)}</span>
    </div>

    ${p.failure_reason ? `<p style="margin-top:16px;padding:12px;background:#fee2e2;border-radius:8px;font-size:13px;color:#b91c1c;"><strong>Failure reason:</strong> ${p.failure_reason}</p>` : ""}
  </div>
  <div class="footer">
    This receipt was generated by NetLodge. For questions, contact support via your dashboard.
    <br>Receipt ID: ${p.id} · Generated ${new Date().toISOString()}
  </div>
</div>
<script>window.print();</script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=720,height=900");
  if (!printWindow) {
    alert("Please allow pop-ups to download your receipt.");
    return;
  }
  printWindow.document.write(receiptHtml);
  printWindow.document.close();
}
