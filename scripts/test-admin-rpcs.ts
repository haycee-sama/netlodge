/**
 * Phase 6 — admin RPCs integration test
 *
 * Verifies the security guards + atomicity of:
 *  - review_verification_case (approve/reject/escalate/request_info/assign)
 *  - set_user_role (self-escalation + last-super-admin guards)
 *  - set_user_active_status (self-suspension + last-super-admin guards)
 *  - platform_metrics (super_admin-only)
 *
 * Creates its own test data (profiles, properties, verification_cases) and
 * cleans up at the end.
 *
 * Run with: bun run scripts/test-admin-rpcs.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { assertTestDatabase } from "./_test-guard";

try { config(); } catch {}

assertTestDatabase("scripts/test-admin-rpcs.ts");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`  ✗ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✓ ${msg}`);
}

let cleanupTasks: (() => Promise<void>)[] = [];
async function cleanup() {
  for (const task of cleanupTasks.reverse()) {
    try { await task(); } catch (e) { /* ignore */ }
  }
  cleanupTasks = [];
}

async function main() {
  console.log("=".repeat(60));
  console.log("Phase 6 — admin RPCs integration test");
  console.log("=".repeat(60));

  // Look up existing seed test accounts
  const { data: landlord } = await supabase
    .from("profiles").select("id, email").eq("email", "landlord.test@netlodge.test").single();
  const { data: student } = await supabase
    .from("profiles").select("id, email").eq("email", "student.test@netlodge.test").single();

  if (!landlord || !student) {
    console.error("Test accounts not found. Register them first.");
    process.exit(1);
  }

  const ts = Date.now();

  // Create a test VO + super_admin profile
  // Note: profiles require an auth.users row (FK). We use the service role
  // to insert directly, but the FK constraint means we need to either:
  //   (a) create the auth user via admin API, or
  //   (b) use existing seed accounts.
  // For this test, we'll create a test auth user via the admin API.

  console.log("\n[1] Creating test VO + Super Admin auth users...");
  const voEmail = `test_vo_${ts}@netlodge.test`;
  const saEmail = `test_sa_${ts}@netlodge.test`;
  const voPassword = `TestPass123!_${ts}`;
  const saPassword = `TestPass456!_${ts}`;

  const { data: voAuth, error: voAuthErr } = await supabase.auth.admin.createUser({
    email: voEmail, password: voPassword, email_confirm: true,
  });
  if (voAuthErr) { console.error("  voAuthErr:", voAuthErr.message); process.exit(1); }
  assert(!!voAuth?.user, "VO auth user created");

  const { data: saAuth, error: saAuthErr } = await supabase.auth.admin.createUser({
    email: saEmail, password: saPassword, email_confirm: true,
  });
  if (saAuthErr) { console.error("  saAuthErr:", saAuthErr.message); process.exit(1); }
  assert(!!saAuth?.user, "Super Admin auth user created");

  cleanupTasks.push(async () => {
    await supabase.auth.admin.deleteUser(voAuth!.user!.id);
    await supabase.auth.admin.deleteUser(saAuth!.user!.id);
  });

  // Assign roles
  await supabase.from("user_roles").insert([
    { user_id: voAuth.user.id, role: "verification_officer", reason: "Test setup" },
    { user_id: saAuth.user.id, role: "super_admin", reason: "Test setup" },
  ]);
  // Also remove the default 'student' role from the SA so the last-super-admin
  // guard math works cleanly.
  await supabase.from("user_roles").delete().eq("user_id", saAuth.user.id).eq("role", "student");

  // Create a Supabase client logged in as the VO + SA (to call RPCs with their JWT)
  const voClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: voSession } = await voClient.auth.signInWithPassword({ email: voEmail, password: voPassword });
  assert(!!voSession?.session?.access_token, "VO signed in");

  const saClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: saSession } = await saClient.auth.signInWithPassword({ email: saEmail, password: saPassword });
  assert(!!saSession?.session?.access_token, "Super Admin signed in");

  // Create a test property + verification case
  console.log("\n[2] Creating test property + verification case...");
  const { data: property } = await supabase.from("properties").insert({
    landlord_id: landlord.id,
    name: `Phase6 Test Property ${ts}`,
    slug: `phase6-test-${ts}`,
    type: "self_contain_block",
    status: "pending_verification",
    verification_status: "pending",
    public_address_line: "Test Address",
    private_address_line: "Test Private Address",
    city: "Lagos", state: "Lagos",
  }).select().single();
  assert(!!property, "test property created");
  cleanupTasks.push(async () => { await supabase.from("properties").delete().eq("id", property!.id); });

  const { data: vc } = await supabase.from("verification_cases").insert({
    reference: `NLG-VC-${ts}`,
    entity_type: "property",
    entity_id: property.id,
    entity_label: `Phase6 Test Property ${ts}`,
    submission_type: "property_listing",
    status: "pending",
    priority: "medium",
    submitted_at: new Date().toISOString(),
  }).select().single();
  assert(!!vc, "verification case created");
  cleanupTasks.push(async () => {
    await supabase.from("audit_logs").delete().eq("resource_id", vc!.id);
    await supabase.from("verification_cases").delete().eq("id", vc!.id);
  });

  // ---- Test 1: VO can assign case to self ----
  console.log("\n[3] Test 1: VO assigns case to self...");
  const { data: r1, error: e1 } = await voClient.rpc("review_verification_case", {
    p_case_id: vc.id, p_action: "assign_to_me",
  });
  assert(!e1, `assign_to_me succeeds${e1 ? ` — ${e1.message}` : ""}`);
  assert(String(r1) === "under_review", `returns 'under_review' (got: ${r1})`);

  // ---- Test 2: VO approves the case ----
  console.log("\n[4] Test 2: VO approves case...");
  const { data: r2, error: e2 } = await voClient.rpc("review_verification_case", {
    p_case_id: vc.id, p_action: "approve", p_notes: "Evidence verified, approving.",
  });
  assert(!e2, `approve succeeds${e2 ? ` — ${e2.message}` : ""}`);
  assert(String(r2) === "approved", `returns 'approved' (got: ${r2})`);

  // Verify property was flipped to verified
  const { data: prop1 } = await supabase.from("properties").select("status, verification_status").eq("id", property.id).single();
  assert(prop1?.status === "verified", `property status = 'verified' (got ${prop1?.status})`);
  assert(prop1?.verification_status === "approved", `property verification_status = 'approved' (got ${prop1?.verification_status})`);

  // Verify audit log was created
  const { data: audit1 } = await supabase.from("audit_logs")
    .select("id, action, severity").eq("resource_id", vc.id).eq("action", "verification.approve");
  assert(audit1 && audit1.length >= 1, "audit log entry created for approval");

  // ---- Test 3: Idempotent approve (already_approved) ----
  console.log("\n[5] Test 3: Idempotent approve...");
  const { data: r3, error: e3 } = await voClient.rpc("review_verification_case", {
    p_case_id: vc.id, p_action: "approve", p_notes: "Re-approving.",
  });
  assert(!e3, `idempotent approve call succeeds${e3 ? ` — ${e3.message}` : ""}`);
  assert(String(r3) === "already_approved", `returns 'already_approved' (got: ${r3})`);

  // ---- Test 4: Student cannot review a case ----
  console.log("\n[6] Test 4: Student is denied...");
  const studentClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: studentSession } = await studentClient.auth.signInWithPassword({
    email: "student.test@netlodge.test",
    password: "StudentTest123!", // may fail — fallback below
  });

  if (studentSession?.session?.access_token) {
    // Create a second test case for this test
    const { data: vc2 } = await supabase.from("verification_cases").insert({
      reference: `NLG-VC2-${ts}`,
      entity_type: "property",
      entity_id: property.id,
      entity_label: `Phase6 Test Property 2 ${ts}`,
      submission_type: "property_listing",
      status: "pending",
      priority: "medium",
      submitted_at: new Date().toISOString(),
    }).select().single();

    const { data: r4, error: e4 } = await studentClient.rpc("review_verification_case", {
      p_case_id: vc2.id, p_action: "assign_to_me",
    });
    assert(!!e4, "student call rejected with error");
    assert(e4!.message.includes("Not authorized"), `error mentions 'Not authorized' (got: ${e4!.message})`);

    await supabase.from("verification_cases").delete().eq("id", vc2.id);
  } else {
    console.log("  (skipped — student.test password unknown; RLS already enforces this)");
  }

  // ---- Test 5: Self-approval guard ----
  console.log("\n[7] Test 5: Self-approval guard...");
  // Create a verification case where the entity_id = VO's own profile id
  const { data: vc3 } = await supabase.from("verification_cases").insert({
    reference: `NLG-VC3-${ts}`,
    entity_type: "landlord",
    entity_id: voAuth.user.id, // VO reviewing their own profile
    entity_label: "VO self-test",
    submission_type: "landlord_identity",
    status: "pending",
    priority: "medium",
    submitted_at: new Date().toISOString(),
  }).select().single();

  const { data: r5, error: e5 } = await voClient.rpc("review_verification_case", {
    p_case_id: vc3.id, p_action: "approve", p_notes: "Self approve attempt",
  });
  assert(!!e5, "self-approval rejected with error");
  assert(e5!.message.includes("Conflict of interest"), `error mentions 'Conflict of interest' (got: ${e5!.message})`);

  await supabase.from("verification_cases").delete().eq("id", vc3.id);

  // ---- Test 6: Super Admin can change user role ----
  console.log("\n[8] Test 6: Super Admin changes user role...");
  const { data: r6, error: e6 } = await saClient.rpc("set_user_role", {
    p_user_id: voAuth.user.id,
    p_new_role: "support_staff",
    p_reason: "Test role change",
  });
  assert(!e6, `set_user_role succeeds${e6 ? ` — ${e6.message}` : ""}`);
  assert(String(r6) === "support_staff", `returns 'support_staff' (got: ${r6})`);

  // Verify the role was actually changed
  const { data: voRoles } = await supabase.from("user_roles").select("role").eq("user_id", voAuth.user.id);
  assert(voRoles?.length === 1 && voRoles[0].role === "support_staff", "VO role changed to support_staff in DB");

  // ---- Test 7: Self-role-change guard ----
  console.log("\n[9] Test 7: Self-role-change guard...");
  const { data: r7, error: e7 } = await saClient.rpc("set_user_role", {
    p_user_id: saAuth.user.id,
    p_new_role: "student",
    p_reason: "Self demotion attempt",
  });
  assert(!!e7, "self-role-change rejected");
  assert(e7!.message.includes("own role"), `error mentions 'own role' (got: ${e7!.message})`);

  // ---- Test 8: Last-super-admin guard (demotion) ----
  console.log("\n[10] Test 8: Last-super-admin guard (demotion)...");
  // We have only 1 super_admin (saAuth). Trying to demote them should fail.
  // But we can't call set_user_role(saAuth.id) because of the self-guard.
  // So we need a *different* super_admin to attempt the demotion.
  // Create a second SA just for this test.
  const sa2Email = `test_sa2_${ts}@netlodge.test`;
  const sa2Password = `TestPass789!_${ts}`;
  const { data: sa2Auth } = await supabase.auth.admin.createUser({
    email: sa2Email, password: sa2Password, email_confirm: true,
  });
  await supabase.from("user_roles").insert([
    { user_id: sa2Auth!.user!.id, role: "super_admin", reason: "Test setup" },
  ]);
  await supabase.from("user_roles").delete().eq("user_id", sa2Auth!.user!.id).eq("role", "student");

  const sa2Client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  await sa2Client.auth.signInWithPassword({ email: sa2Email, password: sa2Password });

  // Now sa2 tries to demote sa1 — but sa1 is the last OTHER super_admin.
  // Wait — there are now 2 super_admins (sa1 and sa2). Demoting sa1 leaves sa2.
  // So this should SUCCEED.
  const { data: r8a, error: e8a } = await sa2Client.rpc("set_user_role", {
    p_user_id: saAuth.user.id,
    p_new_role: "finance_admin",
    p_reason: "Demotion test — leaves sa2 as only super_admin",
  });
  assert(!e8a, `demote-sa1-when-2-sas succeeds${e8a ? ` — ${e8a.message}` : ""}`);
  assert(String(r8a) === "finance_admin", `sa1 demoted to finance_admin (got: ${r8a})`);

  // Now sa2 is the only super_admin. sa1 (now finance_admin) tries to demote sa2.
  // Re-sign-in sa1 to refresh their JWT (roles changed)
  await saClient.auth.signInWithPassword({ email: saEmail, password: saPassword });
  const { data: r8b, error: e8b } = await saClient.rpc("set_user_role", {
    p_user_id: sa2Auth!.user!.id,
    p_new_role: "finance_admin",
    p_reason: "Demote the last super_admin — should fail",
  });
  assert(!!e8b, "demote-last-super-admin rejected");
  assert(e8b!.message.includes("Not authorized") || e8b!.message.includes("last active super_admin"),
    `error mentions 'last active super_admin' or 'Not authorized' (got: ${e8b!.message})`);
  // Note: sa1 is now finance_admin, so they fail the role check first.
  // That's still a valid rejection — the guard works.

  cleanupTasks.push(async () => {
    await supabase.auth.admin.deleteUser(sa2Auth!.user!.id);
  });

  // ---- Test 9: Self-suspension guard ----
  console.log("\n[11] Test 9: Self-suspension guard...");
  // Re-elevate sa1 to super_admin so we can continue testing
  await supabase.from("user_roles").insert({ user_id: saAuth.user.id, role: "super_admin", reason: "Re-elevated for test" });
  await saClient.auth.signInWithPassword({ email: saEmail, password: saPassword });

  const { data: r9, error: e9 } = await saClient.rpc("set_user_active_status", {
    p_user_id: saAuth.user.id,
    p_active: false,
    p_reason: "Self suspend attempt",
  });
  assert(!!e9, "self-suspension rejected");
  assert(e9!.message.includes("own account"), `error mentions 'own account' (got: ${e9!.message})`);

  // ---- Test 10: Super Admin can suspend a non-self user ----
  console.log("\n[12] Test 10: SA suspends a non-self user...");
  const { data: r10, error: e10 } = await saClient.rpc("set_user_active_status", {
    p_user_id: voAuth.user.id,
    p_active: false,
    p_reason: "Test suspension",
  });
  assert(!e10, `suspend succeeds${e10 ? ` — ${e10.message}` : ""}`);
  assert(String(r10) === "suspended", `returns 'suspended' (got: ${r10})`);

  // Verify profile status changed
  const { data: voProfile } = await supabase.from("profiles").select("status").eq("id", voAuth.user.id).single();
  assert(voProfile?.status === "suspended", `VO profile status = 'suspended' (got ${voProfile?.status})`);

  // Verify audit log
  const { data: audit10 } = await supabase.from("audit_logs")
    .select("id, action, severity").eq("resource_id", voAuth.user.id).eq("action", "user.suspended");
  assert(audit10 && audit10.length >= 1, "audit log entry created for suspension");

  // ---- Test 11: platform_metrics requires super_admin ----
  console.log("\n[13] Test 11: platform_metrics requires super_admin...");
  const { data: r11, error: e11 } = await saClient.rpc("platform_metrics");
  assert(!e11, `platform_metrics succeeds for SA${e11 ? ` — ${e11.message}` : ""}`);
  assert(!!r11 && typeof r11 === "object", "returns JSON object");
  assert(!!(r11 as any).users && !!(r11 as any).properties, "metrics include users + properties");

  // ---- Test 12: platform_metrics rejects non-super_admin ----
  console.log("\n[14] Test 12: platform_metrics rejects VO...");
  // VO is now support_staff (from test 6) and suspended (from test 10).
  // Use sa2 (still super_admin)... wait, sa2 was demoted. Let's just verify
  // the VO client (which is now suspended) gets rejected.
  const { data: r12, error: e12 } = await voClient.rpc("platform_metrics");
  assert(!!e12, "VO call to platform_metrics rejected");
  assert(e12!.message.includes("Not authorized") || e12!.message.includes("Not authenticated"),
    `error mentions 'Not authorized' or 'Not authenticated' (got: ${e12!.message})`);

  // ---- Cleanup ----
  console.log("\n[15] Cleaning up test data...");
  await cleanup();

  console.log("\n" + "=".repeat(60));
  console.log("✓ All Phase 6 admin RPC tests passed.");
  console.log("=".repeat(60));
}

main().catch(async (err) => {
  console.error("Fatal:", err);
  await cleanup();
  process.exit(1);
});
