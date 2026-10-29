import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/referral/click
 *
 * Logs a referral link click. Called when a user lands on /register?ref=CODE.
 * Body: { code } (the referral code from the URL)
 *
 * This is an anonymous endpoint — no auth required. It just records the
 * click so the agent can see traffic stats.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Referral code is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Look up the agent by referral_code (stored on profiles)
    const { data: agent } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", code)
      .single();

    // Log the click (even if the agent isn't found — we still track the code)
    await supabase.from("referral_clicks").insert({
      referral_code: code,
      agent_id: agent?.id ?? null,
      ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      user_agent: request.headers.get("user-agent") ?? null,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
