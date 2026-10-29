# NetLodge — Risk Register

## Risk Classification
- **Severity**: Critical / High / Medium / Low
- **Likelihood**: High / Medium / Low
- **Impact**: Financial / Operational / Security / Legal / Reputational

---

## R-001: No Separate Test Database
- **Description:** All 7 database-writing test scripts target the production Supabase project. The test guard blocks them, but no isolated test environment exists.
- **Likelihood:** Medium
- **Impact:** Operational (cannot run integration tests)
- **Severity:** Medium
- **Detection:** Test scripts exit with code 2 and refusal message
- **Mitigation:** Create a separate Supabase project; set NETLODGE_TEST_DB
- **Residual risk:** Tests remain unrun until test DB is created

## R-002: Real Paystack Test Card Payment Not Verified E2E
- **Description:** Cloudflare blocks automated Paystack checkout. Manual testing has not been completed.
- **Likelihood:** Medium
- **Impact:** Financial (payment flow may have undiscovered bugs)
- **Severity:** High
- **Detection:** Manual test with test card 4084 0840 8408 4081
- **Mitigation:** Manual E2E test after Vercel env vars configured
- **Residual risk:** Unknown until manually tested

## R-003: No Email Notification Delivery
- **Description:** Critical events (booking confirmation, payment success) only create in-app notifications. No email is sent.
- **Likelihood:** High
- **Impact:** Operational (users may miss important updates)
- **Severity:** Medium
- **Detection:** No email provider configured in env vars
- **Mitigation:** Integrate Resend or Supabase Email (Phase 3)
- **Residual risk:** Users may not receive timely updates

## R-004: Compromised Credentials in Chat History
- **Description:** GitHub token, Paystack live keys, Supabase service role key, DB password, and Upstash token were pasted in chat history.
- **Likelihood:** High
- **Impact:** Security (unauthorized access)
- **Severity:** Critical
- **Detection:** Chat history review
- **Mitigation:** Rotate all exposed credentials
- **Residual risk:** High until credentials are rotated

## R-005: No Backup Verification
- **Description:** Supabase backups are not verified. No restoration procedure is documented.
- **Likelihood:** Low
- **Impact:** Operational (data loss in disaster scenario)
- **Severity:** Medium
- **Detection:** No backup documentation exists
- **Mitigation:** Document and test backup restoration
- **Residual risk:** Unknown backup reliability

## R-006: External Sync Tool Re-corrupts File Modes
- **Description:** An external sync tool periodically sets all tracked files to executable mode (100755) and creates commits with UUID messages.
- **Likelihood:** High
- **Impact:** Operational (repository hygiene)
- **Severity:** Low
- **Detection:** git ls-files -s | grep "^100755" shows 350+ files
- **Mitigation:** core.filemode set to false; mode normalization committed
- **Residual risk:** Sync tool may cause other issues

## R-007: 63 Transitive Dependency Vulnerabilities
- **Description:** bun audit reports 63 vulnerabilities (0 critical, 41 high, 20 moderate, 2 low) in transitive dependencies.
- **Likelihood:** Low
- **Impact:** Security (potential exploitation)
- **Severity:** Low
- **Detection:** bun audit
- **Mitigation:** Most are in build-time deps (js-yaml, prismjs, picomatch). Next.js 16.4.3 resolved 4 critical advisories.
- **Residual risk:** Low — runtime exposure is minimal

## R-008: No Error Monitoring
- **Description:** No Sentry or equivalent error monitoring is configured.
- **Likelihood:** Medium
- **Impact:** Operational (errors go unnoticed)
- **Severity:** Medium
- **Detection:** No error monitoring dependency in package.json
- **Mitigation:** Add Sentry integration
- **Residual risk:** Production errors may go undetected

## R-009: No Dispute Resolution Workflow
- **Description:** The disputes table exists but no create/resolve RPCs are implemented. The disputes page is read-only.
- **Likelihood:** Medium
- **Impact:** Operational (cannot handle student complaints)
- **Severity:** Medium
- **Detection:** No dispute-related RPCs in migrations
- **Mitigation:** Implement dispute workflow (Phase 4)
- **Residual risk:** Students cannot formally dispute bookings

## R-010: No Renewal Workflow
- **Description:** Tenancies expire but students cannot renew. They must create a new booking from scratch.
- **Likelihood:** High
- **Impact:** Operational (poor user experience)
- **Severity:** Medium
- **Detection:** No renewal RPCs in migrations
- **Mitigation:** Implement renewal workflow (Phase 5)
- **Residual risk:** Students lose their room at tenancy end

## R-011: Paystack Webhook Not Configured
- **Description:** The Paystack webhook URL has not been configured in the Paystack Dashboard.
- **Likelihood:** High
- **Impact:** Financial (payment confirmations may be delayed)
- **Severity:** High
- **Detection:** Webhook endpoint exists but no Paystack dashboard confirmation
- **Mitigation:** Configure webhook URL in Paystack Dashboard
- **Residual risk:** Payment verification depends on redirect handler only

## R-012: Supabase Auth Site URL Not Verified
- **Description:** The Supabase Auth Site URL may not be set to the production domain.
- **Likelihood:** Medium
- **Impact:** Operational (login redirects and password reset emails may fail)
- **Severity:** High
- **Detection:** Cannot verify without Supabase dashboard access
- **Mitigation:** Set Site URL to https://netlodge.vercel.app
- **Residual risk:** Auth flows may break for production users
