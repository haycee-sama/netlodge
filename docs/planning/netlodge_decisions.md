# NetLodge — Decision Log

## Classification Key
- **VERIFIED**: Supported by direct repository inspection or executed test
- **PARTIALLY VERIFIED**: Some evidence exists, complete behavior unproven
- **REPORTED**: Stated in previous documentation, not independently confirmed
- **UNKNOWN**: Evidence unavailable
- **RECOMMENDED**: Proposed future design, not existing capability
- **REQUIRES APPROVAL**: Decision cannot be finalized without product owner approval

---

## D-001: Technology Stack — RETAIN
**Status:** VERIFIED
**Decision:** Retain Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Supabase, Paystack
**Rationale:** The stack is modern, well-supported, and the application builds successfully (151/151 pages). No compelling reason to change.
**Alternatives considered:** None — the stack is appropriate for the use case.
**Risk of changing:** High — would require complete rewrite.

## D-002: Prisma Dependency — REMOVE
**Status:** REQUIRES APPROVAL
**Decision:** Remove Prisma and the repository pattern (src/lib/db.ts, src/lib/data/, src/lib/repositories/)
**Rationale:** Prisma is not imported by any production code. The repository pattern was superseded by direct Supabase calls. Prisma adds 63 dependency entries and confusion.
**Alternatives:** Keep as future-use infrastructure.
**Risk of changing:** Low — dead code removal. Requires package.json + bun.lock update.

## D-003: Payment Model — Platform Collects Then Pays Landlord
**Status:** VERIFIED (current implementation)
**Decision:** Retain the current model where Paystack collects payment to the platform account, and payouts to landlords are manual approvals.
**Rationale:** Paystack split payments are not verified. The current model works in test mode. Manual payout approval provides a safety checkpoint.
**Unresolved:** Paystack Transfer API support for automated payouts needs verification. Live key activation requires explicit approval.
**Alternatives:** (1) Paystack split payments, (2) Direct landlord payment with platform fee invoice.

## D-004: Image Storage — Retain Supabase Storage
**Status:** VERIFIED
**Decision:** Use Supabase Storage for all image types (property-images, verification-evidence, ticket-attachments)
**Rationale:** Functional, RLS-protected, cost-effective. Cloudinary is configured in next.config.ts but not actively used.
**Alternatives:** Cloudinary for responsive image transformations.
**Risk of changing:** Low if kept; medium if migrated to Cloudinary.

## D-005: Role Resolution — Deterministic Priority
**Status:** VERIFIED
**Decision:** Use priority order: super_admin > finance_admin > support_staff > verification_officer > landlord > manager > agent > student
**Rationale:** Users with multiple roles need to land on their highest-privilege dashboard. Previous implementation used roles[0] which was nondeterministic.
**Alternatives:** Role switching UI (rejected — adds complexity without clear user benefit).

## D-006: Email Notifications — NOT YET IMPLEMENTED
**Status:** REQUIRES APPROVAL
**Decision:** Choose an email provider (Resend, Supabase Email, or Termii)
**Rationale:** Currently only in-app notifications exist. Critical events (payment confirmation, booking confirmation) should trigger emails.
**Unresolved:** Which provider? What events require email vs in-app only?

## D-007: Dispute Workflow — NOT YET IMPLEMENTED
**Status:** REQUIRES APPROVAL
**Decision:** Define dispute creation/resolution policy and implement RPCs
**Rationale:** The disputes table exists with status/subject/description/amount fields, but no create_dispute or resolve_dispute RPCs are defined. The disputes page is read-only.
**Unresolved:** Who can create disputes? What categories? What SLA? Can support staff issue refunds?

## D-008: Renewal Workflow — NOT YET IMPLEMENTED
**Status:** REQUIRES APPROVAL
**Decision:** Design and implement tenancy renewal flow
**Rationale:** Bookings have check_in/check_out dates but no renewal mechanism. Students whose tenancy is ending cannot extend.
**Unresolved:** Can students renew before expiry? What notice period? Does the landlord need to approve? Does the price change?

## D-009: Agent Assignment Workflow — NOT YET IMPLEMENTED
**Status:** REQUIRES APPROVAL
**Decision:** Define whether agents need their own assignment UI or landlords manage directly
**Rationale:** /agent/assignments and /agent/enquiries are honestly unavailable. The property_assignments table exists but no agent-facing workflow is implemented.
**Unresolved:** Do agents need their own assignment view? Should enquiries route through support tickets?

## D-010: Historical Test Data Cleanup — DEFERRED
**Status:** REQUIRES APPROVAL
**Decision:** Keep the 5 seed properties (UNILAG + UNN) for demonstration; do not delete
**Rationale:** The seed properties are properly created with real data. They serve as test fixtures. Deletion would require cascade cleanup of dependent records.
**Alternatives:** Move to a separate test database (recommended for production).

## D-011: Separate Test Database — RECOMMENDED
**Status:** RECOMMENDED
**Decision:** Create a separate Supabase project for testing; set NETLODGE_TEST_DB
**Rationale:** All 7 database-writing test scripts are blocked by the test guard because they target production. A separate test project would unblock integration testing.
**Cost:** Free tier Supabase project.

## D-012: Paystack Live Mode — REQUIRES APPROVAL
**Status:** REQUIRES APPROVAL
**Decision:** Switch from test mode to live mode for production launch
**Rationale:** Current implementation uses sk_test_* keys. The refund function explicitly refuses live keys as a safety guard. Live mode requires:
  1. Replacing sk_test_* with sk_live_* in Vercel env vars
  2. Removing the sk_test_* check in refundTransaction() (or making it configurable)
  3. Testing with a real card
  4. Verifying webhook delivery from Paystack production
**Unresolved:** Has the business completed Paystack business verification? Are bank accounts set up for payouts?
