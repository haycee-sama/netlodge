/**
 * Verification shared types + re-exports.
 *
 * Phase 4 — the verification domain's public type surface. Client
 * components can import these for type-only usage without dragging in
 * server-only code.
 */
export type {
  SubmitVerificationInput,
  GetOwnStatusInput,
  GetVerificationQueueInput,
  GetDocumentUrlInput,
  ApproveVerificationInput,
  RejectVerificationInput,
  VerificationDocumentKind,
} from "./schemas";

export {
  submitVerificationSchema,
  getOwnStatusSchema,
  getVerificationQueueSchema,
  getDocumentUrlSchema,
  approveVerificationSchema,
  rejectVerificationSchema,
  verificationDocumentKindSchema,
  verificationStatusFilterSchema,
  hasForbiddenVerificationField,
  FORBIDDEN_VERIFICATION_FIELDS,
} from "./schemas";
