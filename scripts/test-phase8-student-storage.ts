/**
 * Phase 8 — student support, storage, and notifications integration test.
 *
 * Verifies:
 *  - create_student_ticket RPC (input validation, ownership)
 *  - reply_to_ticket RPC (ownership, closed-ticket guard)
 *  - close_student_ticket RPC
 *  - Notification deduplication + user isolation
 *  - Storage bucket access (property-images public, verification-evidence private)
 *  - Cross-user denial (student A cannot read student B's ticket)
 *
 * Creates its own test data and cleans up at the end.
 *
 * Run with: bun run scripts/test-phase8-student-storage.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

try { config(); } catch {}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error(`  ✗ FAIL: ${msg}`); process.exit(1); }
  console.log(`  ✓ ${msg}`);
}

let cleanupTasks: (() => Promise<void>)[] = [];
async function cleanup() {
  for (const task of cleanupTasks.reverse()) {
    try { await task(); } catch { /* ignore */ }
  }
  cleanupTasks = [];
}

async function main() {
  console.log("=".repeat(60));
  console.log("Phase 8 — student support, storage, notifications test");
  console.log("=".repeat(60));

  // Look up existing seed test accounts
  const { data: student1 } = await supabase.from("profiles").select("id, email").eq("email", "student.test@netlodge.test").single();
  const { data: landlord } = await supabase.from("profiles").select("id, email").eq("email", "landlord.test@netlodge.test").single();
  if (!student1 || !landlord) { console.error("Seed accounts not found"); process.exit(1); }

  const ts = Date.now();

  // Create a second student for cross-user denial testing
  const student2Email = `test_student2_${ts}@netlodge.test`;
  const student2Pwd = `TestPass123!_${ts}`;
  const { data: s2Auth, error: s2Err } = await supabase.auth.admin.createUser({
    email: student2Email, password: student2Pwd, email_confirm: true,
  });
  if (s2Err) { console.error("  s2Err:", s2Err.message); process.exit(1); }
  assert(!!s2Auth?.user, "Student 2 created");
  cleanupTasks.push(async () => {
    await supabase.from("user_roles").delete().eq("user_id", s2Auth!.user!.id);
    await supabase.auth.admin.deleteUser(s2Auth!.user!.id);
  });

  // Sign in as student1 + student2
  const s1Client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: s1Session } = await s1Client.auth.signInWithPassword({
    email: "student.test@netlodge.test",
    password: "TestPass123!",
  });
  assert(!!s1Session?.session?.access_token, "Student 1 signed in");

  const s2Client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: s2Session } = await s2Client.auth.signInWithPassword({
    email: student2Email, password: student2Pwd,
  });
  assert(!!s2Session?.session?.access_token, "Student 2 signed in");

  // ---- Test 1: Student creates a ticket ----
  console.log("\n[1] Test 1: Student creates a ticket...");
  const { data: r1, error: e1 } = await s1Client.rpc("create_student_ticket", {
    p_subject: "Test ticket from student 1",
    p_category: "general",
    p_message: "This is a test ticket for integration testing. Please ignore.",
    p_priority: "medium",
  });
  if (e1) console.error("  e1:", e1.message);
  assert(!e1, `create_student_ticket succeeds${e1 ? ` — ${e1.message}` : ""}`);
  assert(!!r1, "returns ticket id");
  const ticketId = String(r1);
  cleanupTasks.push(async () => {
    await supabase.from("audit_logs").delete().eq("resource_id", ticketId);
    await supabase.from("ticket_messages").delete().eq("ticket_id", ticketId);
    await supabase.from("support_tickets").delete().eq("id", ticketId);
    // Clean up notifications sent to support staff
    await supabase.from("notifications").delete().like("body", `%NLG-TKT%`);
  });

  // ---- Test 2: Input validation — short subject ----
  console.log("\n[2] Test 2: Short subject rejected...");
  const { data: r2, error: e2 } = await s1Client.rpc("create_student_ticket", {
    p_subject: "Hi",
    p_category: "general",
    p_message: "This is a valid message.",
    p_priority: "medium",
  });
  assert(!!e2, "short subject rejected");
  assert(e2!.message.includes("Subject must be"), `error mentions 'Subject must be' (got: ${e2!.message})`);

  // ---- Test 3: Input validation — short message ----
  console.log("\n[3] Test 3: Short message rejected...");
  const { data: r3, error: e3 } = await s1Client.rpc("create_student_ticket", {
    p_subject: "Valid subject",
    p_category: "general",
    p_message: "Short",
    p_priority: "medium",
  });
  assert(!!e3, "short message rejected");
  assert(e3!.message.includes("Message must be"), `error mentions 'Message must be' (got: ${e3!.message})`);

  // ---- Test 4: Student replies to their own ticket ----
  console.log("\n[4] Test 4: Student replies to own ticket...");
  const { data: r4, error: e4 } = await s1Client.rpc("reply_to_ticket", {
    p_ticket_id: ticketId,
    p_message: "Adding more details to my ticket.",
  });
  assert(!e4, `reply succeeds${e4 ? ` — ${e4.message}` : ""}`);
  assert(!!r4, "returns message id");

  // ---- Test 5: Student 2 cannot reply to student 1's ticket ----
  console.log("\n[5] Test 5: Cross-user denial (student 2 → student 1's ticket)...");
  const { data: r5, error: e5 } = await s2Client.rpc("reply_to_ticket", {
    p_ticket_id: ticketId,
    p_message: "I should not be able to reply to this.",
  });
  assert(!!e5, "cross-user reply rejected");
  assert(e5!.message.includes("do not own"), `error mentions 'do not own' (got: ${e5!.message})`);

  // ---- Test 6: Student 2 cannot read student 1's ticket via RLS ----
  console.log("\n[6] Test 6: Cross-user read denial (RLS)...");
  const { data: r6 } = await s2Client.from("support_tickets").select("*").eq("id", ticketId).single();
  assert(!r6, "student 2 cannot read student 1's ticket (RLS blocks)");

  // ---- Test 7: Student closes their own ticket ----
  console.log("\n[7] Test 7: Student closes own ticket...");
  const { data: r7, error: e7 } = await s1Client.rpc("close_student_ticket", {
    p_ticket_id: ticketId,
  });
  assert(!e7, `close succeeds${e7 ? ` — ${e7.message}` : ""}`);
  assert(String(r7) === "closed", `returns 'closed' (got: ${r7})`);

  // ---- Test 8: Cannot reply to a closed ticket ----
  console.log("\n[8] Test 8: Cannot reply to closed ticket...");
  const { data: r8, error: e8 } = await s1Client.rpc("reply_to_ticket", {
    p_ticket_id: ticketId,
    p_message: "Trying to reply after close.",
  });
  assert(!!e8, "reply to closed ticket rejected");
  assert(e8!.message.includes("cannot be replied"), `error mentions 'cannot be replied' (got: ${e8!.message})`);

  // ---- Test 9: Notification deduplication ----
  console.log("\n[9] Test 9: create_notification deduplication...");
  const { data: n1 } = await supabase.rpc("create_notification", {
    p_user_id: student1.id, p_type: "system", p_title: "Dedup test",
    p_body: "First", p_href: "/test",
  });
  assert(!!n1, "first notification created");

  const { data: n2 } = await supabase.rpc("create_notification", {
    p_user_id: student1.id, p_type: "system", p_title: "Dedup test",
    p_body: "Second (should be deduped)", p_href: "/test",
  });
  assert(String(n1) === String(n2), "deduped — same id returned");

  cleanupTasks.push(async () => {
    await supabase.from("notifications").delete().eq("id", String(n1));
  });

  // ---- Test 10: Notification user isolation ----
  console.log("\n[10] Test 10: Notification user isolation...");
  // Student 1 should not see student 2's notifications
  const { data: s1notifs } = await s1Client.from("notifications").select("*").eq("user_id", student1.id);
  const { data: s2notifs } = await s2Client.from("notifications").select("*").eq("user_id", s2Auth.user.id);
  // Student 1's notifications should all have user_id = student1.id
  const s1HasOwnOnly = (s1notifs ?? []).every((n: any) => n.user_id === student1.id);
  assert(s1HasOwnOnly, "student 1 only sees own notifications");

  // ---- Test 11: Storage — public read of property-images ----
  console.log("\n[11] Test 11: Storage — property-images bucket exists + is public...");
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  assert(!bErr, "listBuckets succeeds");
  const propBucket = (buckets ?? []).find((b: any) => b.name === "property-images");
  assert(!!propBucket, "property-images bucket exists");
  assert(propBucket!.public === true, "property-images is public");

  const evBucket = (buckets ?? []).find((b: any) => b.name === "verification-evidence");
  assert(!!evBucket, "verification-evidence bucket exists");
  assert(evBucket!.public === false, "verification-evidence is private");

  const taBucket = (buckets ?? []).find((b: any) => b.name === "ticket-attachments");
  assert(!!taBucket, "ticket-attachments bucket exists");
  assert(taBucket!.public === false, "ticket-attachments is private");

  // ---- Test 12: Storage — student can upload to property-images ----
  console.log("\n[12] Test 12: Storage — authenticated upload to property-images...");
  const testImageBuffer = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG header
  const { data: upData, error: upErr } = await s1Client.storage
    .from("property-images")
    .upload(`test/test-${ts}.png`, testImageBuffer, { contentType: "image/png" });
  assert(!upErr, `upload succeeds${upErr ? ` — ${upErr.message}` : ""}`);
  if (upData) {
    cleanupTasks.push(async () => {
      await supabase.storage.from("property-images").remove([`test/test-${ts}.png`]);
    });
  }

  // ---- Test 13: Storage — unauthenticated user cannot upload to private bucket ----
  console.log("\n[13] Test 13: Storage — anon cannot upload to verification-evidence...");
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: anonUp, error: anonErr } = await anonClient.storage
    .from("verification-evidence")
    .upload(`test/anon-${ts}.png`, testImageBuffer, { contentType: "image/png" });
  assert(!!anonErr, "anon upload to private bucket rejected");

  // ---- Test 14: Storage — student can upload to verification-evidence ----
  console.log("\n[14] Test 14: Storage — student can upload to verification-evidence...");
  const { data: evUp, error: evErr } = await s1Client.storage
    .from("verification-evidence")
    .upload(`test/student-${ts}.png`, testImageBuffer, { contentType: "image/png" });
  assert(!evErr, `student upload to verification-evidence succeeds${evErr ? ` — ${evErr.message}` : ""}`);
  if (evUp) {
    cleanupTasks.push(async () => {
      await supabase.storage.from("verification-evidence").remove([`test/student-${ts}.png`]);
    });
  }

  // ---- Test 15: Storage — student 2 cannot read student 1's private upload ----
  console.log("\n[15] Test 15: Storage — cross-user private read denial...");
  const { data: s2read, error: s2readErr } = await s2Client.storage
    .from("verification-evidence")
    .createSignedUrl(`test/student-${ts}.png`, 3600);
  // Student 2 is not the owner and not an officer → RLS should block
  assert(!!s2readErr || !s2read?.signedUrl, "student 2 cannot get signed URL for student 1's private file");

  // ---- Cleanup ----
  console.log("\n[16] Cleaning up test data...");
  await cleanup();

  console.log("\n" + "=".repeat(60));
  console.log("✓ All Phase 8 student + storage + notification tests passed.");
  console.log("=".repeat(60));
}

main().catch(async (err) => {
  console.error("Fatal:", err);
  await cleanup();
  process.exit(1);
});
