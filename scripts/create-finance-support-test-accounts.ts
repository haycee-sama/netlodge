/**
 * Create the FA + SS test accounts referenced in TESTING_AND_SECRETS.md.
 *
 * Usage: bun run scripts/create-finance-support-test-accounts.ts
 *
 * Creates:
 *   fa.test@netlodge.test  (finance_admin)
 *   ss.test@netlodge.test  (support_staff)
 *
 * Both with password "TestPass123!". Idempotent — safe to re-run.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

try { config(); } catch {}
try { config({ path: ".env.test" }); } catch {}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);

const TEST_PASSWORD = "TestPass123!";

const accounts = [
  { email: "fa.test@netlodge.test", role: "finance_admin" as const, name: "FA Test" },
  { email: "ss.test@netlodge.test", role: "support_staff" as const, name: "SS Test" },
];

for (const acct of accounts) {
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

  // Ensure the role is assigned + remove the default student role
  await supabase.from("user_roles").upsert(
    { user_id: userId, role: acct.role, reason: "Test setup" },
    { onConflict: "user_id,role" },
  );
  await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "student");
  console.log(`[${acct.email}] role '${acct.role}' assigned`);
}

console.log("\nDone. Test accounts are ready with password:", TEST_PASSWORD);
