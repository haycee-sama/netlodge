/**
 * Observability module — Phase 12.
 *
 * Public surface: logEvent + helpers + RecordingLogSink for tests.
 */
export {
  logEvent,
  log,
  getLogSink,
  setLogSink,
  RecordingLogSink,
  type LogEntry,
  type LogSeverity,
  type LogCategory,
  type LogSink,
} from "@/server/observability/logger";
