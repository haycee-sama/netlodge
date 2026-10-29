import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/agent/referrals
 *
 * Returns the agent's referral stats: total clicks, signups, conversions
 * (booked), completed, and total earnings.
 *
 * Requires authenticated agent session.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify the caller is an agent
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isAgent = (roles ?? []).some((r: { role: string }) => r.role === "agent");
    if (!isAgent) {
      return NextResponse.json({ error: "Only agents can view referral stats" }, { status: 403 });
    }

    // Get the agent's referral code
    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .single();

    const referralCode = profile?.referral_code ?? user.id.slice(0, 8).toUpperCase();

    // Count clicks
    const { count: clicks } = await supabase
      .from("referral_clicks")
      .select("*", { count: "exact", head: true })
      .eq("referral_code", referralCode);

    // Count referrals by status
    const { data: referrals } = await supabase
      .from("referrals")
      .select("id, status, commission_kobo, commission_paid, signed_up_at, first_booking_at, completed_at, referred_user_id")
      .eq("agent_id", user.id)
      .order("signed_up_at", { ascending: false });

    const allReferrals = referrals ?? [];
    const signups = allReferrals.length;
    const booked = allReferrals.filter((r: { status: string }) => ["booked", "completed"].includes(r.status)).length;
    const completed = allReferrals.filter((r: { status: string }) => r.status === "completed").length;
    const totalEarnings = allReferrals
      .filter((r: { commission_paid: boolean }) => r.commission_paid)
      .reduce((s: number, r: { commission_kobo: number }) => s + r.commission_kobo, 0);
    const pendingEarnings = allReferrals
      .filter((r: { commission_paid: boolean }) => !r.commission_paid)
      .reduce((s: number, r: { commission_kobo: number }) => s + r.commission_kobo, 0);

    return NextResponse.json({
      referralCode,
      clicks: clicks ?? 0,
      signups,
      booked,
      completed,
      totalEarnings,
      pendingEarnings,
      recentReferrals: allReferrals.slice(0, 10),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
