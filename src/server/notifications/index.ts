/**
 * Notifications module — Phase 11 + Phase 13.
 *
 * Public surface: dispatch + types + providers (Console, HTTP, SMTP).
 */
export { dispatchNotification, dispatchNotifications } from "@/server/notifications/core";
export {
  ConsoleEmailProvider,
  HttpEmailProvider,
  SmtpEmailProvider,
  getDefaultEmailProvider,
  _setTestEmailProvider,
} from "@/server/notifications/providers";
export type {
  NotificationEvent,
  NotificationPayload,
  NotificationResult,
  NotificationOutcome,
  EmailProvider,
} from "@/server/notifications/types";
