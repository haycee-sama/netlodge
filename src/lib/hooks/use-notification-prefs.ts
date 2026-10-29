"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";

export interface NotificationPrefs {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  urgent_alerts: boolean;
  daily_digest: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  email_enabled: true,
  sms_enabled: false,
  push_enabled: true,
  urgent_alerts: true,
  daily_digest: false,
};

/**
 * Loads and persists notification preferences to the
 * notification_preferences table. The table is RLS-protected so users
 * can only read/write their own row.
 *
 * Returns { prefs, loading, error, updatePref, savingKey }.
 * updatePref saves a single field to the database and shows a toast.
 */
export function useNotificationPrefs() {
  const { session } = useAuth();
  const [prefs, setPrefs] = React.useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [savingKey, setSavingKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!session?.userId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from("notification_preferences")
      .select("email_enabled, sms_enabled, push_enabled, urgent_alerts, daily_digest")
      .eq("user_id", session.userId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          // PGRST116 = no row found; defaults are used and the row is
          // created on first save via upsert.
          if (error.code !== "PGRST116") {
            setError(error.message);
          }
        } else if (data) {
          setPrefs(data as NotificationPrefs);
        }
        setLoading(false);
      });
  }, [session?.userId]);

  const updatePref = React.useCallback(
    async (key: keyof NotificationPrefs, value: boolean) => {
      if (!session?.userId) return;
      setSavingKey(key);
      // Optimistic update
      setPrefs((prev) => ({ ...prev, [key]: value }));
      try {
        const supabase = createClient();
        const { error: upsertError } = await supabase
          .from("notification_preferences")
          .upsert({
            user_id: session.userId,
            [key]: value,
            updated_at: new Date().toISOString(),
          });
        if (upsertError) throw upsertError;
        toast.success(`${key.replace(/_/g, " ")} ${value ? "enabled" : "disabled"}`);
      } catch (err) {
        // Revert on failure
        setPrefs((prev) => ({ ...prev, [key]: !value }));
        toast.error("Could not save preference", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      } finally {
        setSavingKey(null);
      }
    },
    [session?.userId],
  );

  return { prefs, loading, error, updatePref, savingKey };
}
