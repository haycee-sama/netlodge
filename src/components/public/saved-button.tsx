"use client";

import * as React from "react";
import { Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";

interface SavedButtonProps {
  propertyId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Heart-shaped save/unsave button for property cards.
 *
 * - Shows the saved state on mount by querying saved_properties.
 * - Toggles the saved_properties row on click.
 * - For unauthenticated users: redirects to /register.
 * - For non-student users: shows a toast (only students can save).
 * - Prevents the click from navigating to the property detail page
 *   (stopPropagation + preventDefault).
 */
export function SavedButton({ propertyId, className, size = "md" }: SavedButtonProps) {
  const { session } = useAuth();
  const [saved, setSaved] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [toggling, setToggling] = React.useState(false);

  // Check if this property is already saved
  React.useEffect(() => {
    if (!session?.userId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from("saved_properties")
      .select("id")
      .eq("property_id", propertyId)
      .eq("user_id", session.userId)
      .maybeSingle()
      .then(({ data }) => {
        setSaved(!!data);
        setLoading(false);
      });
  }, [propertyId, session?.userId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Unauthenticated → redirect to register
    if (!session?.userId) {
      window.location.href = `/register?redirect=/properties`;
      return;
    }

    // Non-student → toast
    if (session.role !== "student") {
      toast.error("Only students can save properties");
      return;
    }

    setToggling(true);
    try {
      const supabase = createClient();
      if (saved) {
        const { error } = await supabase
          .from("saved_properties")
          .delete()
          .eq("property_id", propertyId)
          .eq("user_id", session.userId);
        if (error) throw new Error(error.message);
        setSaved(false);
      } else {
        const { error } = await supabase
          .from("saved_properties")
          .insert({
            property_id: propertyId,
            user_id: session.userId,
          });
        if (error) throw new Error(error.message);
        setSaved(true);
        toast.success("Saved", { description: "Added to your saved properties." });
      }
    } catch (e) {
      toast.error("Could not save property", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setToggling(false);
    }
  }

  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  const btnSize = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-11 w-11" : "h-9 w-9";

  return (
    <button
      onClick={toggle}
      disabled={loading || toggling}
      aria-label={saved ? "Remove from saved" : "Save property"}
      aria-pressed={saved}
      className={cn(
        "absolute right-3 top-3 flex items-center justify-center rounded-full border border-border bg-background/90 backdrop-blur-sm shadow-sm transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        btnSize,
        saved && "border-destructive/30 bg-destructive/10",
        className,
      )}
    >
      {loading || toggling ? (
        <Loader2 className={cn(iconSize, "animate-spin text-muted-foreground")} aria-hidden />
      ) : (
        <Heart
          className={cn(
            iconSize,
            "transition-colors",
            saved ? "fill-destructive text-destructive" : "text-foreground/70 hover:text-foreground",
          )}
          aria-hidden
        />
      )}
    </button>
  );
}
