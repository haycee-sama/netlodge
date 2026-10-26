"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-components";
import { rooms as allRooms } from "@/lib/data/fixtures";
import { ngnToKobo } from "@/lib/utils/format";
import { toast } from "sonner";
import { useParams } from "next/navigation";

export default function EditRoomPage() {
  const params = useParams<{ id: string }>();
  const room = allRooms.find((r) => r.id === params.id);
  const [annualRentNgn, setAnnualRentNgn] = React.useState(room ? String(room.annualRentKobo / 100) : "");
  const [bookingTerms, setBookingTerms] = React.useState(room?.bookingTerms ?? "");
  const [submitting, setSubmitting] = React.useState(false);

  if (!room) {
    return <div className="mx-auto max-w-3xl"><p className="text-sm text-muted-foreground">Room not found.</p></div>;
  }

  async function submit() {
    setSubmitting(true);
    try {
      const { getRepositories } = await import("@/lib/repositories");
      await getRepositories().rooms.update(room!.id, {
        annualRentKobo: ngnToKobo(Number(annualRentNgn)),
        bookingTerms,
      });
      toast.success("Room updated");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/landlord/rooms/${room.id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          Back to room
        </Link>
      </Button>

      <PageHeader eyebrow="Edit" title={`Unit ${room.identifier}`} description="Update pricing and booking terms." />

      <Card>
        <CardHeader><CardTitle className="text-base">Pricing & terms</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="annualRent">Annual rent (NGN)</Label>
            <Input id="annualRent" type="number" min={0} step={50000} value={annualRentNgn} onChange={(e) => setAnnualRentNgn(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bookingTerms">Booking terms</Label>
            <Textarea id="bookingTerms" rows={4} value={bookingTerms} onChange={(e) => setBookingTerms(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline"><Link href={`/landlord/rooms/${room.id}`}>Cancel</Link></Button>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Saving…</> : <><Save className="mr-2 h-4 w-4" aria-hidden /> Save changes</>}
        </Button>
      </div>
    </div>
  );
}
