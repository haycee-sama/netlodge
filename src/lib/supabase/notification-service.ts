/**
 * Notification service — user-facing notification operations.
 *
 * Works for all authenticated users (students, landlords, staff, admins).
 * RLS ensures users only see their own notifications.
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

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  created_at: string;
}

export async function fetchNotifications(
  request?: Request,
): Promise<ServiceResult<{ items: NotificationRow[]; unread_count: number }>> {
  const authResult = await requireAuth(request);
  if ("status" in authResult) return authResult;
  const { user, supabase } = authResult;

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return err(error.message, 500);

  const items = (data ?? []) as NotificationRow[];
  const unreadCount = items.filter((n) => !n.read).length;
  return ok({ items, unread_count: unreadCount });
}

export async function markNotificationRead(
  notificationId: string,
  request?: Request,
): Promise<ServiceResult<{ ok: true }>> {
  const authResult = await requireAuth(request);
  if ("status" in authResult) return authResult;
  const { user, supabase } = authResult;

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id); // RLS also enforces

  if (error) return err(error.message, 500);
  return ok({ ok: true });
}

export async function markAllNotificationsRead(
  request?: Request,
): Promise<ServiceResult<{ ok: true }>> {
  const authResult = await requireAuth(request);
  if ("status" in authResult) return authResult;
  const { user, supabase } = authResult;

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) return err(error.message, 500);
  return ok({ ok: true });
}
