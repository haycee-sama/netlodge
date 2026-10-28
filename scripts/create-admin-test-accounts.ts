/**
 * Create the VO + SA test accounts referenced in TESTING_AND_SECRETS.md.
 *
 * Usage: bun run scripts/create-admin-test-accounts.ts
 *
 * Creates:
 *   vo.test@netlodge.test  (verification_officer)
 *   sa.test@netlodge.test  (super_admin)
 *
 * Both with password "TestPass123!". Idempotent — safe to re-run.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

try { config(); } catch {}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);

const TEST_PASSWORD = "TestPass123!";

const accounts = [
  { email: "vo.test@netlodge.test", role: "verification_officer" as const, name: "VO Test" },
  { email: "sa.test@netlodge.test", role: "super_admin" as const, name: "SA Test" },
];

for (const acct of accounts) {
  // Try to find an existing user with this email
  const { data: existing } = await supabase.from("profiles").select("id").eq("email", acct.email).single();

  let userId: string;

  if (existing?.id) {
    userId = existing.id;
    console.log(`[${acct.email}] already exists (${userId})`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: acct.email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: acct.name.split(" ")[0], last_name: acct.name.split(" ")[1] },
    });
    if (error) {
      console.error(`[${acct.email}] failed to create:`, error.message);
      continue;
    }
    userId = data.user!.id;
    console.log(`[${acct.email}] created (${userId})`);
  }

  // Ensure the role is assigned
  const { error: roleErr } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: acct.role, reason: "Test setup" }, { onConflict: "user_id,role" });

  if (roleErr) {
    console.error(`[${acct.email}] failed to assign role:`, roleErr.message);
  } else {
    console.log(`[${acct.email}] role '${acct.role}' assigned`);
  }
}

console.log("\nDone. Test accounts are ready with password:", TEST_PASSWORD);
