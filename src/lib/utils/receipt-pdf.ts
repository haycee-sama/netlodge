"use client";

import { jsPDF } from "jspdf";
import type { PaymentWithBooking } from "@/lib/supabase/payment-service";
import { formatNgn, formatDateTime, formatDate } from "@/lib/utils/format";

/**
 * Generates a branded PDF receipt for a payment and triggers a download.
 *
 * Pure client-side — no backend needed. Uses jsPDF to draw a professional
 * receipt with the NetLodge logo (rendered as vector text since we can't
 * load external SVGs into jsPDF without async fetching), company details,
 * payment breakdown, booking details, and status badge.
 *
 * Works for both student and landlord receipts. The `recipientLabel`
 * parameter controls whether the recipient section shows "Student" or
 * "Landlord".
 */

interface ReceiptOptions {
  /** Who is receiving this receipt — "student" or "landlord" */
  recipientLabel?: string;
  /** Recipient name (e.g. the student's full name) */
  recipientName?: string;
  /** Recipient email */
  recipientEmail?: string;
}

export function downloadPaymentReceiptPdf(
  p: PaymentWithBooking,
  opts: ReceiptOptions = {},
): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // ─── Colors (RGB tuples) ───────────────────────────────────────────
  const PRIMARY: [number, number, number] = [16, 122, 87]; // emerald-700
  const PRIMARY_LIGHT: [number, number, number] = [220, 252, 231]; // green-100
  const DARK: [number, number, number] = [26, 26, 26];
  const MUTED: [number, number, number] = [107, 114, 128];
  const LIGHT_BG: [number, number, number] = [249, 250, 251];
  const BORDER: [number, number, number] = [229, 231, 235];
  const SUCCESS: [number, number, number] = [21, 128, 61];
  const SUCCESS_BG: [number, number, number] = [220, 252, 231];
  const WARNING: [number, number, number] = [180, 83, 9];
  const WARNING_BG: [number, number, number] = [254, 243, 199];
  const DANGER: [number, number, number] = [185, 28, 28];
  const DANGER_BG: [number, number, number] = [254, 226, 226];

  // ─── Header band (emerald) ─────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 90, "F");

  // Logo mark — a white rounded square with "N" (vector, no external image)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 24, 42, 42, 8, 8, "F");
  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("N", margin + 14, 52);

  // Brand wordmark
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("NetLodge", margin + 54, 42);

  // Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(220, 255, 230);
  doc.text("Verified student housing, protected payments", margin + 54, 56);

  // Receipt title (right-aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("PAYMENT RECEIPT", pageWidth - margin, 42, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(220, 255, 230);
  doc.text(`Issued ${formatDateTime(new Date().toISOString())}`, pageWidth - margin, 56, { align: "right" });

  y = 110;

  // ─── Status badge ──────────────────────────────────────────────────
  const statusColors = getStatusColors(p.status, { SUCCESS, SUCCESS_BG, WARNING, WARNING_BG, DANGER, DANGER_BG });
  const badgeText = p.status.charAt(0).toUpperCase() + p.status.slice(1);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const badgeWidth = doc.getTextWidth(badgeText) + 20;
  doc.setFillColor(...statusColors.bg);
  doc.roundedRect(margin, y, badgeWidth, 20, 4, 4, "F");
  doc.setTextColor(...statusColors.fg);
  doc.text(badgeText, margin + 10, y + 14);
  y += 30;

  // ─── Recipient + Reference (two columns) ───────────────────────────
  const colWidth = (contentWidth - 20) / 2;
  const leftCol = margin;
  const rightCol = margin + colWidth + 20;

  // Left: Recipient
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`${opts.recipientLabel ?? "STUDENT"}`, leftCol, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  const recipientName = opts.recipientName ?? "—";
  doc.text(recipientName, leftCol, y);
  y += 14;
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const recipientEmail = opts.recipientEmail ?? "";
  if (recipientEmail) {
    doc.text(recipientEmail, leftCol, y);
    y += 14;
  }

  // Right: Receipt number (reset y to align with left column top)
  let yRight = y - (recipientEmail ? 28 : 14) - 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("RECEIPT NO.", rightCol, yRight);
  yRight += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(p.reference, rightCol, yRight);

  y = Math.max(y, yRight) + 20;

  // ─── Divider ───────────────────────────────────────────────────────
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  // ─── Booking details ───────────────────────────────────────────────
  const booking = p.bookings;
  if (booking) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("BOOKING DETAILS", margin, y);
    y += 16;

    const rows: [string, string][] = [
      ["Booking reference", booking.reference],
      ["Property", booking.properties?.name ?? "—"],
    ];
    // @ts-expect-error — check_in/check_out may exist on the booking object
    if (booking.check_in) rows.push(["Check-in", formatDate(booking.check_in)]);
    // @ts-expect-error — check_in/check_out may exist on the booking object
    if (booking.check_out) rows.push(["Check-out", formatDate(booking.check_out)]);

    for (const [label, value] of rows) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(label, margin, y);
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      doc.text(String(value), pageWidth - margin, y, { align: "right" });
      y += 16;
    }
    y += 8;
  }

  // ─── Payment details ───────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("PAYMENT DETAILS", margin, y);
  y += 16;

  const payRows: [string, string][] = [
    ["Date initiated", formatDateTime(p.initiated_at)],
    ["Payment channel", p.channel.toUpperCase()],
    ["Currency", p.currency],
  ];
  if (p.gateway_reference) payRows.push(["Gateway reference (Paystack)", p.gateway_reference]);
  if (p.confirmed_at) payRows.push(["Confirmed at", formatDateTime(p.confirmed_at)]);

  for (const [label, value] of payRows) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(label, margin, y);
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(value, pageWidth - margin, y, { align: "right" });
    y += 16;
  }
  y += 8;

  // ─── Amount breakdown (highlighted box) ────────────────────────────
  const boxHeight = 110;
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(margin, y, contentWidth, boxHeight, 6, 6, "F");

  let boxY = y + 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Amount
  doc.setTextColor(...MUTED);
  doc.text("Amount", margin + 16, boxY);
  doc.setTextColor(...DARK);
  doc.text(formatNgn(p.amount_kobo), pageWidth - margin - 16, boxY, { align: "right" });
  boxY += 18;

  // Gateway fee
  doc.setTextColor(...MUTED);
  doc.text("Payment gateway fee", margin + 16, boxY);
  doc.setTextColor(...DANGER);
  doc.text(`−${formatNgn(p.fee_kobo)}`, pageWidth - margin - 16, boxY, { align: "right" });
  boxY += 18;

  // Net
  doc.setTextColor(...MUTED);
  doc.text(opts.recipientLabel === "landlord" ? "Net to landlord" : "Net amount", margin + 16, boxY);
  doc.setTextColor(...SUCCESS);
  doc.text(formatNgn(p.net_kobo), pageWidth - margin - 16, boxY, { align: "right" });
  boxY += 22;

  // Total line
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.line(margin + 16, boxY, pageWidth - margin - 16, boxY);
  boxY += 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text("Total paid", margin + 16, boxY);
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(14);
  doc.text(formatNgn(p.amount_kobo), pageWidth - margin - 16, boxY, { align: "right" });

  y += boxHeight + 20;

  // ─── Failure reason (if any) ───────────────────────────────────────
  if (p.failure_reason) {
    doc.setFillColor(...DANGER_BG);
    doc.roundedRect(margin, y, contentWidth, 40, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DANGER);
    doc.text("Payment failure reason", margin + 12, y + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(p.failure_reason, contentWidth - 24);
    doc.text(lines, margin + 12, y + 30);
    y += 50;
  }

  // ─── Footer ────────────────────────────────────────────────────────
  const footerY = pageHeight - 60;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("This is a computer-generated receipt. No signature is required.", margin, footerY + 16);
  doc.text(
    `Support: ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@netlodge.com"}`,
    margin,
    footerY + 28,
  );
  doc.text(`Receipt ID: ${p.id}`, pageWidth - margin, footerY + 16, { align: "right" });
  doc.text("NetLodge Technologies Ltd. — Lagos, Nigeria", pageWidth - margin, footerY + 28, {
    align: "right",
  });

  // ─── Save ──────────────────────────────────────────────────────────
  doc.save(`receipt-${p.reference}.pdf`);
}

function getStatusColors(
  status: string,
  palette: {
    SUCCESS: [number, number, number];
    SUCCESS_BG: [number, number, number];
    WARNING: [number, number, number];
    WARNING_BG: [number, number, number];
    DANGER: [number, number, number];
    DANGER_BG: [number, number, number];
  },
): { fg: [number, number, number]; bg: [number, number, number] } {
  if (status === "successful") {
    return { fg: palette.SUCCESS, bg: palette.SUCCESS_BG };
  }
  if (status === "failed") {
    return { fg: palette.DANGER, bg: palette.DANGER_BG };
  }
  // pending, initiated, etc.
  return { fg: palette.WARNING, bg: palette.WARNING_BG };
}
