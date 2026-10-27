/**
 * Student support service — student-facing ticket operations.
 *
 * All functions:
 *  1. Require an authenticated Supabase session.
 *  2. Verify the caller owns the ticket (for read/reply/close).
 *  3. Call SECURITY DEFINER RPCs for state changes.
 *  4. Enforce input validation server-side.
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

async function requireAuth(request?: Request): Promise<{ user: User; supabase: SupabaseUserClient } | ServiceResult<never>> {
  const supabase = await createUserClient(request);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return err("Not authenticated", 401);
  return { user, supabase };
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

export interface StudentTicketRow {
  id: string;
  reference: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  message: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  first_response_at: string | null;
  assigned_to: string | null;
}

export async function fetchStudentTickets(
  request?: Request,
): Promise<ServiceResult<{ items: StudentTicketRow[] }>> {
  const authResult = await requireAuth(request);
  if ("status" in authResult) return authResult;
  const { user, supabase } = authResult;

  // RLS ensures user_id = auth.uid() — students only see their own
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, reference, subject, category, priority, status, message, created_at, updated_at, resolved_at, first_response_at, assigned_to")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return err(error.message, 500);
  return ok({ items: (data ?? []) as StudentTicketRow[] });
}

export interface StudentTicketDetail extends StudentTicketRow {
  messages: TicketMessageRow[];
}

export interface TicketMessageRow {
  id: string;
  author_id: string;
  author_role: string;
  author_name: string | null;
  message: string;
  internal: boolean;
  created_at: string;
}

export async function fetchStudentTicketDetail(
  ticketId: string,
  request?: Request,
): Promise<ServiceResult<StudentTicketDetail>> {
  const authResult = await requireAuth(request);
  if ("status" in authResult) return authResult;
  const { user, supabase } = authResult;

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .eq("user_id", user.id) // ownership enforced at DB level too
    .single();

  if (error || !ticket) return err("Ticket not found", 404);

  // Fetch messages — RLS on ticket_messages ensures the student can only see
  // messages on their own tickets. Internal notes are filtered out by RLS
  // (the policy checks ticket ownership, but internal flag is set by the
  // author — we filter here as defense in depth).
  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("id, author_id, author_role, author_name, message, internal, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  // Filter out internal notes for students (defense in depth — RLS should
  // already restrict, but the policy on ticket_messages checks ticket
  // ownership, not the internal flag. So we filter here.)
  const visibleMessages = (messages ?? []).filter((m: any) => !m.internal);

  return ok({
    ...(ticket as StudentTicketRow),
    messages: visibleMessages as TicketMessageRow[],
  });
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

export interface CreateTicketInput {
  subject: string;
  category: string;
  message: string;
  priority?: string;
  relatedBookingId?: string;
  relatedPaymentReference?: string;
  relatedPropertyId?: string;
}

export async function createTicket(
  input: CreateTicketInput,
  request?: Request,
): Promise<ServiceResult<{ ticketId: string }>> {
  const authResult = await requireAuth(request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const { data, error } = await supabase.rpc("create_student_ticket", {
    p_subject: input.subject,
    p_category: input.category,
    p_message: input.message,
    p_priority: input.priority ?? "medium",
    p_related_booking_id: input.relatedBookingId ?? null,
    p_related_payment_reference: input.relatedPaymentReference ?? null,
    p_related_property_id: input.relatedPropertyId ?? null,
  });

  if (error) {
    if (error.message.includes("Not authenticated")) return err(error.message, 401);
    if (error.message.includes("must be") || error.message.includes("required") || error.message.includes("Invalid") || error.message.includes("not own") || error.message.includes("not authorized")) {
      return err(error.message, 400);
    }
    if (error.message.includes("not found")) return err(error.message, 404);
    return err(error.message, 500);
  }
  return ok({ ticketId: String(data ?? "") });
}

export async function replyToTicket(
  ticketId: string,
  message: string,
  request?: Request,
): Promise<ServiceResult<{ messageId: string }>> {
  const authResult = await requireAuth(request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const { data, error } = await supabase.rpc("reply_to_ticket", {
    p_ticket_id: ticketId,
    p_message: message,
  });

  if (error) {
    if (error.message.includes("Not authenticated")) return err(error.message, 401);
    if (error.message.includes("do not own")) return err(error.message, 403);
    if (error.message.includes("not found")) return err(error.message, 404);
    if (error.message.includes("must be") || error.message.includes("cannot be replied")) return err(error.message, 400);
    return err(error.message, 500);
  }
  return ok({ messageId: String(data ?? "") });
}

export async function closeTicket(
  ticketId: string,
  request?: Request,
): Promise<ServiceResult<{ newStatus: string }>> {
  const authResult = await requireAuth(request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const { data, error } = await supabase.rpc("close_student_ticket", {
    p_ticket_id: ticketId,
  });

  if (error) {
    if (error.message.includes("Not authenticated")) return err(error.message, 401);
    if (error.message.includes("do not own")) return err(error.message, 403);
    if (error.message.includes("not found")) return err(error.message, 404);
    return err(error.message, 500);
  }
  return ok({ newStatus: String(data ?? "") });
}
