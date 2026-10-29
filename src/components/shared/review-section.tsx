"use client";

import * as React from "react";
import { Star, Loader2, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime, initials } from "@/lib/utils/format";
import { toast } from "sonner";

interface Review {
  id: string;
  overall_rating: number;
  cleanliness_rating: number | null;
  location_rating: number | null;
  value_rating: number | null;
  title: string;
  body: string | null;
  landlord_response: string | null;
  landlord_response_at: string | null;
  created_at: string;
  student_id: string;
  profiles?: { first_name: string; last_name: string }[] | null;
}

interface ReviewSectionProps {
  propertyId: string;
  landlordId: string;
}

export function ReviewSection({ propertyId, landlordId }: ReviewSectionProps) {
  const { session } = useAuth();
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);

  const loadReviews = React.useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("reviews")
      .select(`
        id, overall_rating, cleanliness_rating, location_rating, value_rating,
        title, body, landlord_response, landlord_response_at, created_at, student_id,
        profiles!reviews_student_id_fkey(first_name, last_name)
      `)
      .eq("property_id", propertyId)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setReviews(data as Review[]);
    }
    setLoading(false);
  }, [propertyId]);

  React.useEffect(() => { loadReviews(); }, [loadReviews]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.overall_rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-lg font-semibold">Reviews</h3>
          {avgRating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
              <span className="font-medium">{avgRating}</span>
              <span className="text-sm text-muted-foreground">({reviews.length})</span>
            </div>
          )}
        </div>
        {session?.role === "student" && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
            Write a review
          </Button>
        )}
      </div>

      {showForm && session?.userId && (
        <ReviewForm
          propertyId={propertyId}
          landlordId={landlordId}
          studentId={session.userId}
          onSubmitted={() => {
            setShowForm(false);
            loadReviews();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No reviews yet. Be the first to review this property.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {initials(r.profiles?.[0]?.first_name, r.profiles?.[0]?.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {r.profiles && r.profiles[0] ? `${r.profiles[0].first_name} ${r.profiles[0].last_name}`.trim() : "Anonymous"}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(r.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < r.overall_rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                        aria-hidden
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm font-medium">{r.title}</p>
                {r.body && <p className="text-sm text-muted-foreground">{r.body}</p>}
                {r.landlord_response && (
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Landlord response</p>
                    <p className="mt-1 text-sm">{r.landlord_response}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewForm({
  propertyId,
  landlordId,
  studentId,
  onSubmitted,
  onCancel,
}: {
  propertyId: string;
  landlordId: string;
  studentId: string;
  onSubmitted: () => void;
  onCancel: () => void;
}) {
  const [overall, setOverall] = React.useState(5);
  const [cleanliness, setCleanliness] = React.useState(0);
  const [location, setLocation] = React.useState(0);
  const [value, setValue] = React.useState(0);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function submit() {
    if (title.length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();

      // Find a completed/active booking for this student at this property
      const { data: booking } = await supabase
        .from("bookings")
        .select("id")
        .eq("student_id", studentId)
        .eq("property_id", propertyId)
        .in("status", ["confirmed", "active", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!booking) {
        toast.error("You can only review properties you've booked");
        setSubmitting(false);
        return;
      }

      // Check if already reviewed
      const { data: existing } = await supabase
        .from("reviews")
        .select("id")
        .eq("booking_id", booking.id)
        .maybeSingle();

      if (existing) {
        toast.error("You've already reviewed this booking");
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.from("reviews").insert({
        booking_id: booking.id,
        property_id: propertyId,
        student_id: studentId,
        landlord_id: landlordId,
        overall_rating: overall,
        cleanliness_rating: cleanliness || null,
        location_rating: location || null,
        value_rating: value || null,
        title,
        body: body || null,
      });

      if (error) throw new Error(error.message);

      toast.success("Review published");
      onSubmitted();
    } catch (e) {
      toast.error("Could not submit review", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Write a review</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Overall rating</Label>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setOverall(i + 1)}
                aria-label={`${i + 1} stars`}
              >
                <Star
                  className={`h-6 w-6 transition-colors ${i < overall ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30 hover:text-amber-400"}`}
                  aria-hidden
                />
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Cleanliness", value: cleanliness, setter: setCleanliness },
            { label: "Location", value: location, setter: setLocation },
            { label: "Value", value: value, setter: setValue },
          ].map((r) => (
            <div key={r.label} className="space-y-1">
              <p className="text-xs text-muted-foreground">{r.label}</p>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button key={i} onClick={() => r.setter(i + 1)} aria-label={`${r.label} ${i + 1}`}>
                    <Star
                      className={`h-4 w-4 ${i < r.value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                      aria-hidden
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reviewTitle">Title *</Label>
          <Input id="reviewTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summarize your experience" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reviewBody">Your review (optional)</Label>
          <Textarea id="reviewBody" value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="What was your experience like?" />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Send className="mr-2 h-4 w-4" aria-hidden />}
            Publish review
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
