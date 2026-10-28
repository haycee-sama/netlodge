import type { Metadata } from "next";
import { RoomDetailPage } from "./room-detail-page";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  // We don't fetch the room server-side (the client component already does),
  // but we set a sensible title and mark it as noindex because individual
  // room pages are not the primary indexable content — property pages are.
  // Room URLs use UUIDs which are not stable for SEO.
  return {
    title: "Room details",
    description: "View room facilities, availability, and booking options on NetLodge.",
    robots: { index: false, follow: true },
    alternates: { canonical: `/rooms/${id}` },
  };
}

export default function Page() {
  return <RoomDetailPage />;
}
