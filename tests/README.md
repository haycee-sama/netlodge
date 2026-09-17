# NetLodge — Tests

| Layer        | Location              | Runner     | What it proves                          |
| ------------ | --------------------- | ---------- | --------------------------------------- |
| Unit         | `tests/unit/`         | Vitest     | Pure-function business logic.          |
| Integration  | `tests/integration/`  | Vitest     | React component rendering, module wiring. |
| E2E          | `tests/e2e/`          | Playwright | Full browser journeys against dev server.|

## Commands

```bash
npm run test              # vitest run (unit + integration)
npm run test:watch        # vitest watch mode
npm run test:ui           # vitest interactive UI
npm run test:e2e          # playwright run
npm run test:e2e:install  # install Chromium for Playwright
npm run verify            # typecheck + lint + test + build (the full pre-PR gate)
```

## Phase 0 scope

Phase 0 ships:

- `tests/unit/errors.test.ts` — proves the standardized error model serializes correctly.
- `tests/unit/validation.test.ts` — proves Zod helpers work and money stays in kobo.
- `tests/integration/home-page.test.tsx` — proves the React foundation renders.
- `tests/e2e/smoke.spec.ts` — proves Playwright works against the dev server.

Real E2E journeys (the nine listed in `IMPLEMENTATION_PLAN.md` §20) are
added in the relevant later phases — Phase 0 is foundation only.
