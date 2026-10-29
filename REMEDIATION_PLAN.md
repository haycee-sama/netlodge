# NetLodge — Remediation Plan

## Prioritized Remediation Roadmap

### Immediate (No action required — confirmed secure)
- ✅ All Critical and High vulnerabilities: **None found**
- ✅ Payment integrity: Server-authoritative pricing, idempotent confirmation, webhook verification
- ✅ Authentication: Rate limiting, session refresh, MFA support
- ✅ Authorization: RLS on all tables, SECURITY DEFINER with search_path, explicit ownership checks
- ✅ Database: Immutable ledger, audit triggers, idempotent constraints

### Low Priority (Recommended hardening)

| ID | Finding | Priority | Effort | Fix |
|---|---|---|---|---|
| SEC-LOW-001 | Admin verification routes missing `validateOrigin` | Low | 10 min | Add `validateOrigin(request)` to 2 POST handlers |
| SEC-LOW-002 | Hardcoded "32 days ago" in admin profile | Low | 5 min | Remove the field or fetch from auth metadata |
| SEC-LOW-003 | Unused Unsplash domains in next.config.ts | Low | 2 min | Remove 2 entries from remotePatterns |
| PR-001 | Homepage stats not cached (5 parallel queries per load) | Low | 30 min | Use anon client for public stats + unstable_cache |
| PR-002 | N+1 query pattern in messaging page | Low | 30 min | Single query with subqueries |
| CQ-001 | ESLint React Compiler warning | Low | 10 min | Align useCallback dependencies |
| F-002 | Unused Unsplash in next.config | Low | 2 min | Remove entries |
| A11Y-004 | Map markers not keyboard-focusable | Low | 30 min | Add tabIndex + keyboard handlers |

### Informational (No action needed)

| ID | Finding | Status |
|---|---|---|
| F-003 | Admin settings read-only | By design — reauth workflow is a future feature |
| F-004 | Dispute workflow incomplete | By design — workflow definition is a product decision |
| CQ-002 | 29 client-side mutations | Standard Supabase pattern, all RLS-protected |
| CQ-003 | No unit test framework | Integration tests provide good coverage; unit tests are a nice-to-have |
| SEC-UNV-001 | Transitive dev-dependency vulnerabilities | Not in production bundle |

## Implementation Order

1. **SEC-LOW-001**: Add `validateOrigin` to 2 admin verification routes (10 min)
2. **SEC-LOW-002**: Remove hardcoded "32 days ago" (5 min)
3. **SEC-LOW-003 / F-002**: Remove Unsplash from next.config (2 min)
4. **PR-001**: Cache homepage stats with anon client (30 min)
5. **CQ-001**: Fix React Compiler warning (10 min)
6. **PR-002**: Fix N+1 in messaging (30 min)
7. **A11Y-004**: Keyboard-accessible map markers (30 min)

## Regression Tests

| Fix | Regression Test |
|---|---|
| SEC-LOW-001 | POST to /api/admin/verification/[id]/review with mismatched Origin → 403 |
| SEC-LOW-002 | Admin profile page should not show "32 days ago" |
| SEC-LOW-003 | Build should succeed without Unsplash in remotePatterns |
| PR-001 | Homepage loads with cached stats (verify via response time) |

## Acceptance Criteria

- TypeScript: 0 errors
- ESLint: 0 errors (warnings acceptable)
- Production build: success
- All 103 existing tests: pass
- No new vulnerabilities introduced
