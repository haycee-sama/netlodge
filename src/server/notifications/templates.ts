/**
 * Email templates — Phase 11.
 *
 * Defines the subject + body for each NotificationEvent. Templates are
 * pure functions of the event payload — they never touch the DB or call
 * the email provider.
 *
 * Per API_CONTRACTS.md §18 + IMPLEMENTATION_PLAN.md §16, the implemented
 * notification events are:
 *   - landlord_verification.approved / .rejected
 *   - property.approved / .rejected / .suspended / .suspension_lifted
 *   - payment.success.student / .landlord
 *   - booking.cancelled.student / .landlord
 *   - booking.expired.student
 *   - report.resolved
 *   - review.hidden / .unhidden
 *
 * The "reservation created (optional)" notification from PRD §15 is NOT
 * implemented — it's explicitly marked optional and not in IMPLEMENTATION_PLAN
 * §16's mandatory list.
 */

// ── Template registry ──────────────────────────────────────────────────────

export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

// ── Helper: escape HTML ──────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Verification templates ──────────────────────────────────────────────────

export function landlordVerificationApprovedEmail(data: {
  landlordFullName: string;
  validUntil: string | null;
}): EmailTemplate {
  return {
    subject: "Your NetLodge landlord verification is approved",
    htmlBody: `<p>Hi ${escapeHtml(data.landlordFullName)},</p>
<p>Your landlord verification has been approved${
      data.validUntil ? ` (valid until ${escapeHtml(data.validUntil)})` : ""
    }.</p>
<p>You can now create and submit properties for approval.</p>
<p>— The NetLodge team</p>`,
    textBody: `Hi ${data.landlordFullName},

Your landlord verification has been approved${
      data.validUntil ? ` (valid until ${data.validUntil})` : ""
    }.

You can now create and submit properties for approval.

— The NetLodge team`,
  };
}

export function landlordVerificationRejectedEmail(data: {
  landlordFullName: string;
  reason: string;
}): EmailTemplate {
  return {
    subject: "Your NetLodge landlord verification needs revision",
    htmlBody: `<p>Hi ${escapeHtml(data.landlordFullName)},</p>
<p>Your landlord verification submission was rejected. Please review the reason below, make the necessary changes, and resubmit.</p>
<p><strong>Reason:</strong> ${escapeHtml(data.reason)}</p>
<p>— The NetLodge team</p>`,
    textBody: `Hi ${data.landlordFullName},

Your landlord verification submission was rejected. Please review the reason below, make the necessary changes, and resubmit.

Reason: ${data.reason}

— The NetLodge team`,
  };
}

// ── Property templates ──────────────────────────────────────────────────────

export function propertyApprovedEmail(data: {
  landlordFullName: string;
  propertyArea: string;
}): EmailTemplate {
  return {
    subject: "Your NetLodge property has been approved",
    htmlBody: `<p>Hi ${escapeHtml(data.landlordFullName)},</p>
<p>Your property at ${escapeHtml(data.propertyArea)} has been approved and is now visible to students searching for accommodation.</p>
<p>— The NetLodge team</p>`,
    textBody: `Hi ${data.landlordFullName},

Your property at ${data.propertyArea} has been approved and is now visible to students searching for accommodation.

— The NetLodge team`,
  };
}

export function propertyRejectedEmail(data: {
  landlordFullName: string;
  propertyArea: string;
  reason: string;
}): EmailTemplate {
  return {
    subject: "Your NetLodge property needs revision",
    htmlBody: `<p>Hi ${escapeHtml(data.landlordFullName)},</p>
<p>Your property at ${escapeHtml(data.propertyArea)} was rejected. Please review the reason, make changes, and resubmit.</p>
<p><strong>Reason:</strong> ${escapeHtml(data.reason)}</p>
<p>— The NetLodge team</p>`,
    textBody: `Hi ${data.landlordFullName},

Your property at ${data.propertyArea} was rejected. Please review the reason, make changes, and resubmit.

Reason: ${data.reason}

— The NetLodge team`,
  };
}

export function propertySuspendedEmail(data: {
  landlordFullName: string;
  propertyArea: string;
  reason: string;
}): EmailTemplate {
  return {
    subject: "Your NetLodge property has been suspended",
    htmlBody: `<p>Hi ${escapeHtml(data.landlordFullName)},</p>
<p>Your property at ${escapeHtml(data.propertyArea)} has been suspended by an administrator. It is no longer visible in search and cannot accept new bookings. Existing confirmed bookings remain honored.</p>
<p><strong>Reason:</strong> ${escapeHtml(data.reason)}</p>
<p>If you believe this is in error, please contact support.</p>
<p>— The NetLodge team</p>`,
    textBody: `Hi ${data.landlordFullName},

Your property at ${data.propertyArea} has been suspended by an administrator. It is no longer visible in search and cannot accept new bookings. Existing confirmed bookings remain honored.

Reason: ${data.reason}

If you believe this is in error, please contact support.

— The NetLodge team`,
  };
}

export function propertySuspensionLiftedEmail(data: {
  landlordFullName: string;
  propertyArea: string;
  reason: string;
}): EmailTemplate {
  return {
    subject: "Your NetLodge property suspension has been lifted",
    htmlBody: `<p>Hi ${escapeHtml(data.landlordFullName)},</p>
<p>The suspension on your property at ${escapeHtml(
      data.propertyArea,
    )} has been lifted. It is now visible in search and can accept new bookings again.</p>
<p><strong>Reason:</strong> ${escapeHtml(data.reason)}</p>
<p>— The NetLodge team</p>`,
    textBody: `Hi ${data.landlordFullName},

The suspension on your property at ${data.propertyArea} has been lifted. It is now visible in search and can accept new bookings again.

Reason: ${data.reason}

— The NetLodge team`,
  };
}

// ── Payment / booking templates ──────────────────────────────────────────────

export function paymentSuccessStudentEmail(data: {
  studentFullName: string;
  amountNaira: string;
  propertyArea: string;
  bookingId: string;
}): EmailTemplate {
  return {
    subject: "Your NetLodge reservation is confirmed",
    htmlBody: `<p>Hi ${escapeHtml(data.studentFullName)},</p>
<p>Your payment of ₦${escapeHtml(data.amountNaira)} for your booking at ${escapeHtml(
      data.propertyArea,
    )} has been confirmed. Your reservation is now CONFIRMED.</p>
<p>Booking reference: ${escapeHtml(data.bookingId)}</p>
<p>— The NetLodge team</p>`,
    textBody: `Hi ${data.studentFullName},

Your payment of ₦${data.amountNaira} for your booking at ${data.propertyArea} has been confirmed. Your reservation is now CONFIRMED.

Booking reference: ${data.bookingId}

— The NetLodge team`,
  };
}

export function paymentSuccessLandlordEmail(data: {
  landlordFullName: string;
  studentFullName: string;
  amountNaira: string;
  propertyArea: string;
  bookingId: string;
}): EmailTemplate {
  return {
    subject: "New reservation received on NetLodge",
    htmlBody: `<p>Hi ${escapeHtml(data.landlordFullName)},</p>
<p>You have a new confirmed reservation at ${escapeHtml(
      data.propertyArea,
    )} from ${escapeHtml(data.studentFullName)}.</p>
<p>Amount: ₦${escapeHtml(data.amountNaira)}</p>
<p>Booking reference: ${escapeHtml(data.bookingId)}</p>
<p>— The NetLodge team</p>`,
    textBody: `Hi ${data.landlordFullName},

You have a new confirmed reservation at ${data.propertyArea} from ${data.studentFullName}.

Amount: ₦${data.amountNaira}
Booking reference: ${data.bookingId}

— The NetLodge team`,
  };
}

export function bookingCancelledStudentEmail(data: {
  studentFullName: string;
  propertyArea: string;
  reason: string | null;
  cancelledBy: "student" | "landlord" | "admin";
}): EmailTemplate {
  const actorLabel =
    data.cancelledBy === "student"
      ? "You cancelled"
      : data.cancelledBy === "landlord"
        ? "The landlord cancelled"
        : "An administrator cancelled";
  return {
    subject: "Your NetLodge booking has been cancelled",
    htmlBody: `<p>Hi ${escapeHtml(data.studentFullName)},</p>
<p>${actorLabel} your booking at ${escapeHtml(data.propertyArea)}.</p>
${data.reason ? `<p><strong>Reason:</strong> ${escapeHtml(data.reason)}</p>` : ""}
<p>— The NetLodge team</p>`,
    textBody: `Hi ${data.studentFullName},

${actorLabel} your booking at ${data.propertyArea}.

${data.reason ? `Reason: ${data.reason}\n\n` : ""}— The NetLodge team`,
  };
}

export function bookingCancelledLandlordEmail(data: {
  landlordFullName: string;
  studentFullName: string;
  propertyArea: string;
  reason: string | null;
}): EmailTemplate {
  return {
    subject: "A booking on your NetLodge property has been cancelled",
    htmlBody: `<p>Hi ${escapeHtml(data.landlordFullName)},</p>
<p>${escapeHtml(data.studentFullName)} cancelled their booking at ${escapeHtml(
      data.propertyArea,
    )}.</p>
${data.reason ? `<p><strong>Reason:</strong> ${escapeHtml(data.reason)}</p>` : ""}
<p>— The NetLodge team</p>`,
    textBody: `Hi ${data.landlordFullName},

${data.studentFullName} cancelled their booking at ${data.propertyArea}.

${data.reason ? `Reason: ${data.reason}\n\n` : ""}— The NetLodge team`,
  };
}

export function bookingExpiredStudentEmail(data: {
  studentFullName: string;
  propertyArea: string;
}): EmailTemplate {
  return {
    subject: "Your NetLodge reservation expired",
    htmlBody: `<p>Hi ${escapeHtml(data.studentFullName)},</p>
<p>Your reservation for a room at ${escapeHtml(
      data.propertyArea,
    )} has expired because the payment window elapsed. The room has been released and is now available to other students.</p>
<p>— The NetLodge team</p>`,
    textBody: `Hi ${data.studentFullName},

Your reservation for a room at ${data.propertyArea} has expired because the payment window elapsed. The room has been released and is now available to other students.

— The NetLodge team`,
  };
}

// ── Report resolution template ──────────────────────────────────────────────

export function reportResolvedEmail(data: {
  reporterFullName: string;
  outcome: "action_taken" | "no_action" | "other";
  resolutionNotes: string;
}): EmailTemplate {
  return {
    subject: "Your NetLodge report has been resolved",
    htmlBody: `<p>Hi ${escapeHtml(data.reporterFullName)},</p>
<p>An administrator has resolved your report.</p>
<p><strong>Outcome:</strong> ${escapeHtml(data.outcome.replace(/_/g, " "))}</p>
<p><strong>Notes:</strong> ${escapeHtml(data.resolutionNotes)}</p>
<p>— The NetLodge team</p>`,
    textBody: `Hi ${data.reporterFullName},

An administrator has resolved your report.

Outcome: ${data.outcome.replace(/_/g, " ")}
Notes: ${data.resolutionNotes}

— The NetLodge team`,
  };
}

// ── Review moderation templates ─────────────────────────────────────────────

export function reviewHiddenEmail(data: {
  studentFullName: string;
  reason: string;
}): EmailTemplate {
  return {
    subject: "Your NetLodge review was hidden by an administrator",
    htmlBody: `<p>Hi ${escapeHtml(data.studentFullName)},</p>
<p>Your review has been hidden by an administrator. It is no longer visible to other users.</p>
<p><strong>Reason:</strong> ${escapeHtml(data.reason)}</p>
<p>If you believe this is in error, please contact support.</p>
<p>— The NetLodge team</p>`,
    textBody: `Hi ${data.studentFullName},

Your review has been hidden by an administrator. It is no longer visible to other users.

Reason: ${data.reason}

If you believe this is in error, please contact support.

— The NetLodge team`,
  };
}

export function reviewUnhiddenEmail(data: {
  studentFullName: string;
  reason: string;
}): EmailTemplate {
  return {
    subject: "Your NetLodge review has been restored",
    htmlBody: `<p>Hi ${escapeHtml(data.studentFullName)},</p>
<p>The moderation hold on your review has been lifted. It is visible to other users again.</p>
<p><strong>Reason:</strong> ${escapeHtml(data.reason)}</p>
<p>— The NetLodge team</p>`,
    textBody: `Hi ${data.studentFullName},

The moderation hold on your review has been lifted. It is visible to other users again.

Reason: ${data.reason}

— The NetLodge team`,
  };
}
