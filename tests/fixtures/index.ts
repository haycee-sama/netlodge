/**
 * Shared test fixtures for Vitest unit/integration tests.
 *
 * Phase 0 — minimal. A real test-fixture env (with the required server-only
 * variables set to test-only values) is added in Phase 2 once the first
 * integration test needs to touch the env loader. For Phase 0, the smoke
 * tests don't touch env-dependent code, so no fixture is required yet.
 */
export const TEST_FIXTURES = {
  // Placeholder — added in a later phase when an integration test actually
  // needs a Supabase or Paystack test fixture. Keeping the file now means
  // the import path is stable across phases.
} as const;
