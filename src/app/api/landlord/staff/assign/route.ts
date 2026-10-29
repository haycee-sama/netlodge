import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/landlord/staff/assign
 *
 * Assigns a registered user (looked up by email) to one of the landlord's
 * properties as a property_manager or agent.
 *
 * Body: { email, propertyId, role }
 *
 * Security:
 * - Requires authenticated session (verified server-side)
 * - The caller must be a landlord
 * - The property must belong to the caller (RLS + explicit check)
 * - The target user must exist (looked up via admin client)
 * - The role must be 'property_manager' or 'agent'
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify the caller is a landlord
    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isLandlord = (callerRoles ?? []).some((r: { role: string }) => r.role === "landlord");
    if (!isLandlord) {
      return NextResponse.json({ error: "Only landlords can assign staff" }, { status: 403 });
    }

    const body = await request.json();
    const { email, propertyId, role } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!propertyId || typeof propertyId !== "string") {
      return NextResponse.json({ error: "Property ID is required" }, { status: 400 });
    }
    if (role !== "property_manager" && role !== "agent") {
      return NextResponse.json({ error: "Role must be 'property_manager' or 'agent'" }, { status: 400 });
    }

    // Verify the property belongs to the caller (defense-in-depth, RLS also enforces)
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("id, landlord_id")
      .eq("id", propertyId)
      .eq("landlord_id", user.id)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: "Property not found or not owned by you" }, { status: 404 });
    }

    // Look up the target user by email using the admin client.
    // profiles.email is synced from auth.users.email but we query profiles
    // to get the user_id (which equals the auth.users.id).
    const admin = createAdminClient();
    const { data: targetProfile, error: profileError } = await admin
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (profileError || !targetProfile) {
      return NextResponse.json({
        error: "User not found",
        description: `No NetLodge account found for ${email}. Ask them to register first, then assign them.`,
      }, { status: 404 });
    }

    // Check if the assignment already exists
    const { data: existing } = await supabase
      .from("property_assignments")
      .select("id")
      .eq("property_id", propertyId)
      .eq("user_id", targetProfile.id)
      .eq("role", role)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        error: "Already assigned",
        description: `${targetProfile.first_name || targetProfile.email} is already assigned to this property as ${role}.`,
      }, { status: 409 });
    }

    // Create the assignment
    const { error: assignError } = await supabase
      .from("property_assignments")
      .insert({
        property_id: propertyId,
        user_id: targetProfile.id,
        role,
        assigned_by: user.id,
      });

    if (assignError) {
      console.error("[staff/assign] Insert error:", assignError.message);
      return NextResponse.json({ error: "Could not create assignment" }, { status: 500 });
    }

    // Also assign the user_role so they can access the manager/agent shell
    await admin
      .from("user_roles")
      .upsert({
        user_id: targetProfile.id,
        role,
        reason: `Assigned by landlord ${user.id}`,
      });

    return NextResponse.json({
      success: true,
      staffName: `${targetProfile.first_name} ${targetProfile.last_name}`.trim() || targetProfile.email,
    });
  } catch (err) {
    console.error("[staff/assign] Error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
