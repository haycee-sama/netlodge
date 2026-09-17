-- ─────────────────────────────────────────────────────────────────────────────
-- NetLodge seed — launch-target university
--
-- DEVELOPMENT/TEST SEED ONLY. Never migrate to production.
-- Per IMPLEMENTATION_PLAN.md §24: production starts with only the real launch
-- university and zero fake accounts. This seed is for local/dev/staging only.
--
-- ─── OPEN DECISION FLAGGED ───────────────────────────────────────────────────
-- The planning documents do NOT name the specific launch-target university:
--   * PRODUCT_BRIEF.md §9: "one university market at a time, not all of
--     Nigeria at once" — the strategy, not the choice.
--   * NETLODGE_BLUEPRINT.md §9: "Pick one university (highest off-campus
--     housing demand + a founder/team member with local access)" — explicitly
--     a team decision to make during the 90-day launch plan, not a documented
--     answer.
--   * IMPLEMENTATION_PLAN.md §24: "One seeded university for the launch
--     target" — assumes the team has decided.
--
-- Until that team decision is finalized, this seed uses the University of
-- Lagos (UNILAG) as a placeholder — a real Nigerian university with
-- substantial off-campus housing demand near its Akoka campus. This is NOT
-- an authoritative product decision; it is development data chosen to be
-- representative of the eventual real shape (real Nigerian university name,
-- real city, real state).
--
-- When the team finalizes the actual launch-target university, replace the
-- name/city/state in the INSERT below. The id can stay stable across that
-- swap (the rest of the dev/test data references it by id, not name).
-- ─────────────────────────────────────────────────────────────────────────────

-- Idempotent: ON CONFLICT (name) DO NOTHING. Safe to re-run.
-- The id is FIXED and DETERMINISTIC so test fixtures can reference it
-- without depending on gen_random_uuid()'s non-deterministic output.
INSERT INTO public.universities (id, name, city, state, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'University of Lagos',
  'Lagos',
  'Lagos',
  true
)
ON CONFLICT (name) DO NOTHING;
