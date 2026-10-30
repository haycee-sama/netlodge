/**
 * Admin server service — Verification Officer + Super Admin operations.
 *
 * All functions:
 *  1. Require an authenticated Supabase session (verified server-side).
 *  2. Verify the caller's role via the database (defense in depth —
 *     RLS already enforces this, but we check again here).
 *  3. Call a SECURITY DEFINER RPC that performs the state change atomically
 *     and records an audit log entry.
 *
 * This module is server-only. Never import it from a client component.
 *
 * IMPORTANT: The RPCs use auth.uid(), which means we must call them with
 * the *user's* Supabase client (which carries their JWT), NOT the admin
 * client. The admin client bypasses RLS but auth.uid() returns NULL.
 *
 * The user's JWT arrives via session cookies (browser) OR the Authorization
 * header (API clients). createUserClient() handles both.
 */

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/config/site";

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

/**
 * Create a Supabase client that respects either:
 *  - The user's session cookies (set by the browser via @supabase/ssr), or
 *  - A Bearer token in the Authorization header (used by API clients).
 *
 * This lets the same admin-service code work for both browser-origin
 * requests (cookie-based) and programmatic API calls (Bearer-based).
 */
async function createUserClient(request?: Request): Promise<SupabaseUserClient> {
  // If a Bearer token is present, build a client that uses it
  const authHeader = request?.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const accessToken = authHeader.slice(7);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    // Use @supabase/supabase-js directly — it doesn't have the "use client"
    // directive and works on the server. We pass the access token via
    // the global option so all requests carry it as a Bearer header.
    const client = createSupabaseJsClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    return client as unknown as SupabaseUserClient;
  }

  // Fall back to cookie-based server client
  return (await createServerClient()) as unknown as SupabaseUserClient;
}

async function requireRole(
  allowedRoles: string[],
  request?: Request,
): Promise<{ user: User; supabase: SupabaseUserClient } | ServiceResult<never>> {
  const supabase = await createUserClient(request);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return err("Not authenticated", 401);
  }

  // Fetch the user's roles from the database
  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (rolesError) {
    return err("Failed to verify role", 500);
  }

  const userRoles = (roles ?? []).map((r: any) => r.role as string);
  const hasAllowed = userRoles.some((r: string) => allowedRoles.includes(r));
  if (!hasAllowed) {
    return err(`Forbidden: requires one of ${allowedRoles.join(", ")}`, 403);
  }

  return { user, supabase };
}

// ---------------------------------------------------------------------------
// Verification Officer operations
// ---------------------------------------------------------------------------

export interface VerificationCaseRow {
  id: string;
  reference: string;
  entity_type: "student" | "landlord" | "property" | "room";
  entity_id: string;
  entity_label: string;
  submission_type: string;
  status: string;
  priority: string;
  assigned_officer_id: string | null;
  sla_due_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_id: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  escalated_from: string | null;
  escalated_to: string | null;
  escalated_at: string | null;
  escalation_reason: string | null;
  outstanding_actions: string[];
  created_at: string;
  updated_at: string;
}

export interface VerificationQueueFilters {
  status?: string;
  submissionType?: string;
  entityType?: string;
  q?: string;
  overdue?: boolean;
  assignedToMe?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchVerificationQueue(
  filters: VerificationQueueFilters,
  request?: Request,
): Promise<ServiceResult<{ items: VerificationCaseRow[]; total: number }>> {
  const authResult = await requireRole(["verification_officer", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("verification_cases")
    .select("*", { count: "exact" });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.submissionType && filters.submissionType !== "all") {
    query = query.eq("submission_type", filters.submissionType);
  }
  if (filters.entityType && filters.entityType !== "all") {
    query = query.eq("entity_type", filters.entityType);
  }
  if (filters.q) {
    query = query.or(`reference.ilike.%${filters.q}%,entity_label.ilike.%${filters.q}%`);
  }
  if (filters.overdue) {
    query = query.lt("sla_due_at", new Date().toISOString()).in("status", ["pending", "under_review", "needs_information"]);
  }
  if (filters.assignedToMe) {
    query = query.eq("assigned_officer_id", filters.assignedToMe);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) return err(error.message, 500);

  return ok({ items: (data ?? []) as VerificationCaseRow[], total: count ?? 0 });
}

export interface VerificationCaseDetail extends VerificationCaseRow {
  evidence: VerificationEvidenceRow[];
  notes: InternalNoteRow[];
  audit_logs: AuditLogRow[];
  // Joined entity context
  property?: {
    id: string;
    name: string;
    slug: string;
    landlord_id: string;
    public_address_line: string;
    city: string;
    state: string;
    verification_status: string;
    status: string;
  };
  landlord?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

export interface VerificationEvidenceRow {
  id: string;
  case_id: string;
  type: string;
  label: string;
  file_name: string;
  storage_path: string;
  uploaded_by: string;
  uploaded_at: string;
  status: string;
  reviewer_notes: string | null;
}

export interface InternalNoteRow {
  id: string;
  entity_type: string;
  entity_id: string;
  author_id: string;
  author_name: string;
  message: string;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  timestamp: string;
  actor_id: string | null;
  actor_email: string;
  actor_role: string;
  category: string;
  action: string;
  resource_type: string;
  resource_id: string;
  summary: string;
  severity: string;
}

export async function fetchVerificationCaseDetail(
  caseId: string,
  request?: Request,
): Promise<ServiceResult<VerificationCaseDetail>> {
  const authResult = await requireRole(["verification_officer", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const { data: c, error: caseErr } = await supabase
    .from("verification_cases")
    .select("*")
    .eq("id", caseId)
    .single();
  if (caseErr || !c) return err("Case not found", 404);

  const [evidenceRes, notesRes] = await Promise.all([
    supabase.from("verification_evidence").select("*").eq("case_id", caseId).order("uploaded_at", { ascending: false }),
    supabase.from("internal_notes").select("*").eq("entity_type", "verification_case").eq("entity_id", caseId).order("created_at", { ascending: false }),
  ]);

  // Audit logs — direct query (RLS restricts to permitted rows)
  const { data: aDirect } = await supabase
    .from("audit_logs_safe")
    .select("*")
    .eq("resource_type", "verification_case")
    .eq("resource_id", caseId)
    .order("timestamp", { ascending: false })
    .limit(50);
  const auditLogs: AuditLogRow[] = (aDirect as AuditLogRow[]) ?? [];

  const detail: VerificationCaseDetail = {
    ...(c as VerificationCaseRow),
    evidence: (evidenceRes.data as VerificationEvidenceRow[]) ?? [],
    notes: (notesRes.data as InternalNoteRow[]) ?? [],
    audit_logs: auditLogs,
  };

  // Fetch related property/landlord context if applicable
  if (detail.entity_type === "property") {
    const { data: prop } = await supabase
      .from("properties")
      .select("id, name, slug, landlord_id, public_address_line, city, state, verification_status, status")
      .eq("id", detail.entity_id)
      .single();
    if (prop) detail.property = prop as VerificationCaseDetail["property"];

    if (prop?.landlord_id) {
      const { data: landlord } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .eq("id", prop.landlord_id)
        .single();
      if (landlord) detail.landlord = landlord as VerificationCaseDetail["landlord"];
    }
  } else if (detail.entity_type === "landlord" || detail.entity_type === "student") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .eq("id", detail.entity_id)
      .single();
    if (profile) detail.landlord = profile as VerificationCaseDetail["landlord"];
  }

  return ok(detail);
}

export type ReviewAction = "approve" | "reject" | "request_info" | "escalate" | "assign_to_me";

export interface ReviewInput {
  action: ReviewAction;
  reason?: string;
  notes?: string;
  escalateTo?: "super_admin" | "finance_admin";
}

export async function reviewVerificationCase(
  caseId: string,
  input: ReviewInput,
  request?: Request,
): Promise<ServiceResult<{ newStatus: string }>> {
  const authResult = await requireRole(["verification_officer", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const { data, error } = await supabase.rpc("review_verification_case", {
    p_case_id: caseId,
    p_action: input.action,
    p_reason: input.reason ?? null,
    p_notes: input.notes ?? null,
    p_escalate_to: input.escalateTo ?? null,
  });

  if (error) {
    // Map common PG exceptions to HTTP statuses
    if (error.message.includes("Not authenticated")) return err(error.message, 401);
    if (error.message.includes("Not authorized")) return err(error.message, 403);
    if (error.message.includes("not found")) return err(error.message, 404);
    if (error.message.includes("Conflict of interest")) return err(error.message, 403);
    if (error.message.includes("required")) return err(error.message, 400);
    return err(error.message, 500);
  }

  return ok({ newStatus: String(data ?? "") });
}

export async function addInternalNote(
  caseId: string,
  message: string,
  request?: Request,
): Promise<ServiceResult<{ id: string }>> {
  const authResult = await requireRole(["verification_officer", "super_admin"], request);
  if ("status" in authResult) return authResult;
  const { user, supabase } = authResult;

  if (!message.trim()) return err("Note cannot be empty", 400);

  // Fetch author name
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  const authorName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : user.email ?? "Officer";

  const { data, error } = await supabase
    .from("internal_notes")
    .insert({
      entity_type: "verification_case",
      entity_id: caseId,
      author_id: user.id,
      author_name: authorName,
      message,
    })
    .select("id")
    .single();

  if (error) return err(error.message, 500);
  return ok({ id: data.id });
}

// ---------------------------------------------------------------------------
// Super Admin operations
// ---------------------------------------------------------------------------

export interface AdminUserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  status: string;
  status_reason: string | null;
  created_at: string;
  updated_at: string;
  roles: string[];
  last_seen_at: string | null;
}

export interface UserListFilters {
  q?: string;
  role?: string;
  active?: string; // 'all' | 'active' | 'suspended'
  page?: number;
  pageSize?: number;
}

export async function fetchAdminUsers(
  filters: UserListFilters,
  request?: Request,
): Promise<ServiceResult<{ items: AdminUserRow[]; total: number }>> {
  const authResult = await requireRole(["super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("profiles")
    .select("id, email, first_name, last_name, phone, status, status_reason, created_at, updated_at", { count: "exact" });

  if (filters.q) {
    query = query.or(`email.ilike.%${filters.q}%,first_name.ilike.%${filters.q}%,last_name.ilike.%${filters.q}%`);
  }
  if (filters.active && filters.active !== "all") {
    query = query.eq("status", filters.active === "active" ? "active" : "suspended");
  }

  query = query.order("created_at", { ascending: true }).range(from, to);
  const { data, error, count } = await query;
  if (error) return err(error.message, 500);

  // Fetch roles for these users
  const userIds = (data ?? []).map((u) => u.id);
  const { data: rolesData } = await supabase
    .from("user_roles")
    .select("user_id, role, assigned_at")
    .in("user_id", userIds);

  // Group roles by user
  const rolesByUser: Record<string, { role: string; assigned_at: string }[]> = {};
  for (const r of rolesData ?? []) {
    if (!rolesByUser[r.user_id]) rolesByUser[r.user_id] = [];
    rolesByUser[r.user_id].push({ role: r.role, assigned_at: r.assigned_at });
  }

  const items: AdminUserRow[] = (data ?? []).map((u) => ({
    ...u,
    roles: (rolesByUser[u.id] ?? []).map((r) => r.role),
    last_seen_at: null, // profiles table doesn't have last_seen_at; skip
  }));

  return ok({ items, total: count ?? 0 });
}

export async function fetchAdminUserDetail(userId: string, request?: Request): Promise<ServiceResult<AdminUserRow & { audit_logs: AuditLogRow[] }>> {
  const authResult = await requireRole(["super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, phone, status, status_reason, created_at, updated_at")
    .eq("id", userId)
    .single();
  if (error || !profile) return err("User not found", 404);

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role, assigned_at, reason, assigned_by")
    .eq("user_id", userId)
    .order("assigned_at", { ascending: true });

  const { data: auditLogs } = await supabase
    .from("audit_logs_safe")
    .select("*")
    .eq("resource_id", userId)
    .order("timestamp", { ascending: false })
    .limit(50);

  return ok({
    ...profile,
    roles: (roles ?? []).map((r) => r.role),
    last_seen_at: null,
    audit_logs: (auditLogs as AuditLogRow[]) ?? [],
  });
}

export async function changeUserRole(
  userId: string,
  newRole: string,
  reason: string,
  request?: Request,
): Promise<ServiceResult<{ newRole: string }>> {
  const authResult = await requireRole(["super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  if (!reason.trim()) return err("A reason is required", 400);

  const { data, error } = await supabase.rpc("set_user_role", {
    p_user_id: userId,
    p_new_role: newRole,
    p_reason: reason,
  });

  if (error) {
    if (error.message.includes("Not authenticated")) return err(error.message, 401);
    if (error.message.includes("Not authorized")) return err(error.message, 403);
    if (error.message.includes("own role")) return err(error.message, 403);
    if (error.message.includes("last active super_admin")) return err(error.message, 409);
    if (error.message.includes("not found")) return err(error.message, 404);
    if (error.message.includes("required")) return err(error.message, 400);
    return err(error.message, 500);
  }

  return ok({ newRole: String(data ?? "") });
}

export async function changeUserStatus(
  userId: string,
  active: boolean,
  reason: string,
  request?: Request,
): Promise<ServiceResult<{ newStatus: string }>> {
  const authResult = await requireRole(["super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  if (!active && !reason.trim()) return err("A suspension reason is required", 400);

  const { data, error } = await supabase.rpc("set_user_active_status", {
    p_user_id: userId,
    p_active: active,
    p_reason: reason || null,
  });

  if (error) {
    if (error.message.includes("Not authenticated")) return err(error.message, 401);
    if (error.message.includes("Not authorized")) return err(error.message, 403);
    if (error.message.includes("own account")) return err(error.message, 403);
    if (error.message.includes("last active super_admin")) return err(error.message, 409);
    if (error.message.includes("not found")) return err(error.message, 404);
    if (error.message.includes("required")) return err(error.message, 400);
    return err(error.message, 500);
  }

  return ok({ newStatus: String(data ?? "") });
}

export interface PlatformMetrics {
  users: Record<string, number>;
  users_by_status: Record<string, number>;
  properties: {
    by_status: Record<string, number>;
    by_verification: Record<string, number>;
    total: number;
  };
  rentable_units: {
    by_status: Record<string, number>;
    total: number;
  };
  bookings: {
    by_status: Record<string, number>;
    total: number;
  };
  payments: {
    by_status: Record<string, number>;
    total_kobo: number;
    count: number;
  };
  verification_cases: {
    by_status: Record<string, number>;
    total: number;
  };
  support_tickets: {
    open: number;
    total: number;
  };
}

export async function fetchPlatformMetrics(request?: Request): Promise<ServiceResult<PlatformMetrics>> {
  const authResult = await requireRole(["super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const { data, error } = await supabase.rpc("platform_metrics");
  if (error) return err(error.message, 500);
  return ok(data as PlatformMetrics);
}

export async function fetchAuditLogs(
  filters: { category?: string; severity?: string; q?: string; resourceType?: string; resourceId?: string; page?: number; pageSize?: number },
  request?: Request,
): Promise<ServiceResult<{ items: AuditLogRow[]; total: number }>> {
  const authResult = await requireRole(["super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 50, 200);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("audit_logs_safe")
    .select("*", { count: "exact" });

  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }
  if (filters.severity && filters.severity !== "all") {
    query = query.eq("severity", filters.severity);
  }
  if (filters.resourceType) {
    query = query.eq("resource_type", filters.resourceType);
  }
  if (filters.resourceId) {
    query = query.eq("resource_id", filters.resourceId);
  }
  if (filters.q) {
    query = query.or(`summary.ilike.%${filters.q}%,actor_email.ilike.%${filters.q}%,action.ilike.%${filters.q}%`);
  }

  query = query.order("timestamp", { ascending: false }).range(from, to);
  const { data, error, count } = await query;
  if (error) return err(error.message, 500);
  return ok({ items: (data ?? []) as AuditLogRow[], total: count ?? 0 });
}

// ---------------------------------------------------------------------------
// Platform settings — read-only view (super_admin only).
// Sensitive values (anything whose key matches /secret|key|password|token/i)
// are masked before being returned. The raw value is NEVER exposed.
// ---------------------------------------------------------------------------

export interface PlatformSettingRow {
  id: string;
  key: string;
  label: string;
  description: string;
  type: string;
  value: string;       // already masked for sensitive rows
  is_sensitive: boolean;
  unit: string | null;
  category: string;
  requires_reauth: boolean;
  updated_at: string;
}

const SENSITIVE_KEY_RE = /(secret|password|token|api[_-]?key|private[_-]?key|sk_live|sk_test)/i;

export async function fetchPlatformSettings(
  request?: Request,
): Promise<ServiceResult<{ items: PlatformSettingRow[]; total: number }>> {
  const authResult = await requireRole(["super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const { data, error, count } = await supabase
    .from("platform_settings")
    .select("*", { count: "exact" })
    .order("category", { ascending: true })
    .order("key", { ascending: true });

  if (error) return err(error.message, 500);

  const rows = (data ?? []) as Array<Omit<PlatformSettingRow, "is_sensitive">>;
  const items: PlatformSettingRow[] = rows.map((r) => {
    const isSensitive = SENSITIVE_KEY_RE.test(r.key);
    return {
      ...r,
      is_sensitive: isSensitive,
      value: isSensitive ? "••••••••" : r.value,
    };
  });

  return ok({ items, total: count ?? 0 });
}

// ---------------------------------------------------------------------------
// Integrations — combines persisted integration_health rows with a live
// "effective configuration" check. We never reveal the configured values;
// we only report whether each integration is configured or not.
// ---------------------------------------------------------------------------

export interface IntegrationRow {
  id: string;
  name: string;
  category: string;
  status: string;
  last_success_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  uptime_24h: number;
  avg_response_ms: number;
  enabled: boolean;
  updated_at: string;
}

export interface EffectiveConfigStatus {
  key: string;
  label: string;
  configured: boolean;
  /** When true, the integration is in test/sandbox mode. */
  test_mode: boolean | null;
  /** "configured" | "not_configured" | "unknown" */
  state: "configured" | "not_configured" | "unknown";
  note: string;
}

export interface IntegrationsOverview {
  integrations: IntegrationRow[];
  effective: EffectiveConfigStatus[];
}

export async function fetchIntegrationsOverview(
  request?: Request,
): Promise<ServiceResult<IntegrationsOverview>> {
  const authResult = await requireRole(["super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const { data, error } = await supabase
    .from("integration_health")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) return err(error.message, 500);

  const integrations = (data ?? []) as IntegrationRow[];

  // Effective configuration status — derived from env vars at request time.
  // Never reveal the actual values; only report whether each is set.
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY ?? "";
  const paystackPublic = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY ?? "";
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? "";
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
  const siteUrl = getSiteUrl();
  const cronSecret = process.env.CRON_SECRET ?? "";

  const effective: EffectiveConfigStatus[] = [
    {
      key: "paystack",
      label: "Paystack (payments)",
      configured: !!paystackSecret && !!paystackPublic,
      test_mode: paystackSecret ? paystackSecret.startsWith("sk_test_") : null,
      state: paystackSecret && paystackPublic ? "configured" : "not_configured",
      note: paystackSecret
        ? (paystackSecret.startsWith("sk_test_") ? "Test mode key detected." : "Live key detected — production payments enabled.")
        : "Server-side key is not set. Payment initiation will fail.",
    },
    {
      key: "supabase",
      label: "Supabase (auth + database)",
      configured: !!supabaseUrl && !!supabaseAnon,
      test_mode: null,
      state: supabaseUrl && supabaseAnon ? "configured" : "not_configured",
      note: supabaseUrl && supabaseAnon
        ? "Public URL + publishable key are set."
        : "Missing URL or publishable key. Application cannot authenticate users.",
    },
    {
      key: "supabase_service_role",
      label: "Supabase service role (server-only)",
      configured: !!supabaseSecret,
      test_mode: null,
      state: supabaseSecret ? "configured" : "not_configured",
      note: supabaseSecret
        ? "Service role key is present. Used for admin operations and migrations only."
        : "Service role key is not set. Server-side admin operations will fail.",
    },
    {
      key: "upstash_redis",
      label: "Upstash Redis (distributed rate limiting)",
      configured: !!redisUrl && !!redisToken,
      test_mode: null,
      state: redisUrl && redisToken ? "configured" : "not_configured",
      note: redisUrl && redisToken
        ? "Distributed rate limiting is active. Sensitive endpoints fail closed on Redis errors."
        : "Not configured — rate limiting is process-local (per-instance). Suitable for single-instance deployments only.",
    },
    {
      key: "site_url",
      label: "Site URL (CSRF origin allowlist)",
      configured: !!siteUrl,
      test_mode: null,
      state: siteUrl ? "configured" : "not_configured",
      note: siteUrl
        ? `Configured. CSRF origin checks use this domain.`
        : "Not set. CSRF validation falls back to a permissive default for development.",
    },
    {
      key: "cron_secret",
      label: "Cron secret (reconciliation schedule)",
      configured: !!cronSecret,
      test_mode: null,
      state: cronSecret ? "configured" : "not_configured",
      note: cronSecret
        ? "Set. /api/cron/reconciliation will accept requests with this secret."
        : "Not set. The reconciliation cron endpoint will reject all requests.",
    },
  ];

  return ok({ integrations, effective });
}

// ---------------------------------------------------------------------------
// Security overview — combines audit_logs (security/auth/critical) with
// integration health summary and rate-limiter mode. Read-only.
// ---------------------------------------------------------------------------

export interface SecurityEventRow {
  id: string;
  timestamp: string;
  actor_email: string;
  actor_role: string;
  category: string;
  action: string;
  resource_type: string;
  resource_id: string;
  summary: string;
  severity: string;
}

export interface SecurityOverview {
  recent_events: SecurityEventRow[];
  total_events: number;
  critical_count: number;
  warning_count: number;
  integration_summary: {
    total: number;
    operational: number;
    degraded: number;
    outage: number;
    maintenance: number;
  };
  rate_limiter_mode: "distributed" | "process_local";
}

export async function fetchSecurityOverview(
  filters: { q?: string; page?: number; pageSize?: number },
  request?: Request,
): Promise<ServiceResult<SecurityOverview>> {
  const authResult = await requireRole(["super_admin"], request);
  if ("status" in authResult) return authResult;
  const { supabase } = authResult;

  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 50, 200);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Security events: category in (security, auth) OR severity = 'critical'.
  let query = supabase
    .from("audit_logs_safe")
    .select("*", { count: "exact" })
    .or(`category.eq.security,category.eq.auth,severity.eq.critical`);

  if (filters.q) {
    query = query.or(`summary.ilike.%${filters.q}%,actor_email.ilike.%${filters.q}%,action.ilike.%${filters.q}%`);
  }

  query = query.order("timestamp", { ascending: false }).range(from, to);
  const { data, error, count } = await query;
  if (error) return err(error.message, 500);

  const events = (data ?? []) as SecurityEventRow[];

  // Aggregate severity counts (over the full filtered set, not just this page).
  // We do separate counts to avoid PostgREST filter limits.
  const { count: criticalCount } = await supabase
    .from("audit_logs_safe")
    .select("*", { count: "exact", head: true })
    .eq("severity", "critical");
  const { count: warningCount } = await supabase
    .from("audit_logs_safe")
    .select("*", { count: "exact", head: true })
    .eq("severity", "warning");

  // Integration health summary.
  const { data: integrations } = await supabase
    .from("integration_health")
    .select("status");

  const intRows = (integrations ?? []) as Array<{ status: string }>;
  const integrationSummary = {
    total: intRows.length,
    operational: intRows.filter((i) => i.status === "operational").length,
    degraded: intRows.filter((i) => i.status === "degraded").length,
    outage: intRows.filter((i) => i.status === "outage").length,
    maintenance: intRows.filter((i) => i.status === "maintenance").length,
  };

  // Rate-limiter mode: distributed if both Upstash vars are set, else process-local.
  const rateLimiterMode: "distributed" | "process_local" =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ? "distributed"
      : "process_local";

  return ok({
    recent_events: events,
    total_events: count ?? 0,
    critical_count: criticalCount ?? 0,
    warning_count: warningCount ?? 0,
    integration_summary: integrationSummary,
    rate_limiter_mode: rateLimiterMode,
  });
}
