/**
 * Support server service — Support Agent operations.
 *
 * All functions:
 *  1. Require an authenticated Supabase session (verified server-side).
 *  2. Verify the caller's role (support_staff or super_admin) via the database.
 *  3. Call SECURITY DEFINER RPCs for state changes.
 *
 * This module is server-only. Never import it from a client component.
 */

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}

function ok<T>(data: T): ServiceResult<T> {
  return { data, error: null, status: 200 };
}
function err<T>(error: string, status: number): ServiceResult<T> {
  return { data: null, error, status };
}

interface SupabaseUserClient {
  auth: {
    getUser(accessToken?: string): Promise<{ data: { user: User | null }; error: unknown }>;
    setSession(session: { access_token: string; refresh_token: string }): Promise<unknown>;
  };
  from(table: string): any;
  rpc(name: string, params?: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }>;
}

async function createUserClient(request?: Request): Promise<SupabaseUserClient> {
  const authHeader = request?.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const accessToken = authHeader.slice(7);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    const client = createSupabaseJsClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    return client as unknown as SupabaseUserClient;
  }
  return (await createServerClient()) as unknown as SupabaseUserClient;
}

async function requireRole(
  allowedRoles: string[],
  request?: Request,
): Promise<{ user: User; supabase: SupabaseUserClient } | ServiceResult<never>> {
  const supabase = await createUserClient(request);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return err("Not authenticated", 401);

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles").select("role").eq("user_id", user.id);
  if (rolesError) return err("Failed to verify role", 500);

  const userRoles = (roles ?? []).map((r: any) => r.role as string);
  const hasAllowed = userRoles.some((r: string) => allowedRoles.includes(r));
  if (!hasAllowed) return err(`Forbidden: requires one of ${allowedRoles.join(", ")}`, 403);

  return { user, supabase };
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

export interface SupportTicketRow {
  id: string;
  reference: string;
  user_id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  message: string;
  assigned_to: string | null;
  team: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  sla_due_at: string | null;
  escalated: boolean;
  escalated_to: string | null;
  escalated_reason: string | null;
  related_booking_id: string | null;
  related_payment_reference: string | null;
  related_property_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessageRow {
  id: string;
  ticket_id: string;
  author_id: string;
  author_role: string;
  author_name: string | null;
  message: string;
  internal: boolean;
  created_at: string;
}

export async function fetchTickets(
  filters: { status?: string; priority?: string; q?: string; escalated?: boolean; assignedToMe?: string; page?: number; pageSize?: number },
  request?: Request,
): Promise<ServiceResult<{ items: SupportTicketRow[]; total: number }>> {
  const authResult = await requireRole(["support_staff", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("support_tickets").select("*", { count: "exact" });
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.priority && filters.priority !== "all") query = query.eq("priority", filters.priority);
  if (filters.q) query = query.or(`reference.ilike.%${filters.q}%,subject.ilike.%${filters.q}%`);
  if (filters.escalated) query = query.eq("escalated", true);
  if (filters.assignedToMe) query = query.eq("assigned_to", filters.assignedToMe);
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) return err(error.message, 500);
  return ok({ items: (data ?? []) as SupportTicketRow[], total: count ?? 0 });
}

export interface TicketDetail extends SupportTicketRow {
  messages: TicketMessageRow[];
  user?: { id: string; email: string; first_name: string; last_name: string };
}

export async function fetchTicketDetail(
  ticketId: string,
  request?: Request,
): Promise<ServiceResult<TicketDetail>> {
  const authResult = await requireRole(["support_staff", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const { data: ticket, error } = await supabase
    .from("support_tickets").select("*").eq("id", ticketId).single();
  if (error || !ticket) return err("Ticket not found", 404);

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  const { data: user } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("id", ticket.user_id)
    .single();

  return ok({
    ...(ticket as SupportTicketRow),
    messages: (messages ?? []) as TicketMessageRow[],
    user: user ?? undefined,
  });
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

export type TicketAction = "assign" | "unassign" | "change_status" | "escalate" | "de_escalate" | "set_priority" | "set_team";

export interface UpdateTicketInput {
  action: TicketAction;
  value?: string;
  reason?: string;
}

export async function updateTicket(
  ticketId: string,
  input: UpdateTicketInput,
  request?: Request,
): Promise<ServiceResult<{ newStatus: string }>> {
  const authResult = await requireRole(["support_staff", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const { data, error } = await supabase.rpc("update_support_ticket", {
    p_ticket_id: ticketId,
    p_action: input.action,
    p_value: input.value ?? null,
    p_reason: input.reason ?? null,
    p_actor_email: null,
  });

  if (error) {
    if (error.message.includes("Not authenticated")) return err(error.message, 401);
    if (error.message.includes("Not authorized")) return err(error.message, 403);
    if (error.message.includes("not found")) return err(error.message, 404);
    if (error.message.includes("required") || error.message.includes("Invalid")) return err(error.message, 400);
    return err(error.message, 500);
  }
  return ok({ newStatus: String(data ?? "") });
}

export async function addTicketMessage(
  ticketId: string,
  message: string,
  internal: boolean,
  request?: Request,
): Promise<ServiceResult<{ id: string }>> {
  const authResult = await requireRole(["support_staff", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { user, supabase } = authResult;

  if (!message.trim()) return err("Message cannot be empty", 400);

  // Fetch author name + role
  const { data: profile } = await supabase
    .from("profiles").select("first_name, last_name").eq("id", user.id).single();
  const authorName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : user.email ?? "Agent";

  // Determine author role (support_staff or super_admin)
  const { data: roles } = await supabase
    .from("user_roles").select("role").eq("user_id", user.id);
  const userRoles = (roles ?? []).map((r: any) => r.role as string);
  const authorRole = userRoles.includes("super_admin") ? "super_admin" : "support_staff";

  const { data, error } = await supabase
    .from("ticket_messages")
    .insert({
      ticket_id: ticketId,
      author_id: user.id,
      author_role: authorRole,
      author_name: authorName,
      message,
      internal,
    })
    .select("id")
    .single();

  if (error) return err(error.message, 500);

  // If this is a customer-visible reply and the ticket has no first_response_at,
  // the update_support_ticket RPC's assign action sets it. For non-assign
  // replies, set it here if missing.
  if (!internal) {
    await supabase
      .from("support_tickets")
      .update({ first_response_at: await coalesceFirstResponse(supabase, ticketId), updated_at: new Date().toISOString() })
      .eq("id", ticketId)
      .is("first_response_at", null);
  }

  return ok({ id: data.id });
}

async function coalesceFirstResponse(supabase: SupabaseUserClient, ticketId: string): Promise<string> {
  const { data } = await supabase
    .from("support_tickets").select("first_response_at").eq("id", ticketId).single();
  return data?.first_response_at ?? new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Notification operations
// ---------------------------------------------------------------------------

export async function fetchNotifications(
  request?: Request,
): Promise<ServiceResult<{ items: any[]; unread_count: number }>> {
  const authResult = await requireRole(["support_staff", "verification_officer", "finance_admin", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { user, supabase } = authResult;

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return err(error.message, 500);

  const items = (data ?? []) as any[];
  const unreadCount = items.filter((n) => !n.read).length;
  return ok({ items, unread_count: unreadCount });
}

export async function markNotificationRead(
  notificationId: string,
  request?: Request,
): Promise<ServiceResult<{ ok: true }>> {
  const authResult = await requireRole(["support_staff", "verification_officer", "finance_admin", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { user, supabase } = authResult;

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id); // RLS also enforces this

  if (error) return err(error.message, 500);
  return ok({ ok: true });
}
