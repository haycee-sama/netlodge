import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
import { getPropertyDetail } from "@/server/discovery";

/**
 * Property detail page — Phase 6.
 *
 * Public — no authentication required. Shows the property's area,
 * description, listed rooms, images, and verified badge.
 *
 * Only returns the property if status = 'approved'. A direct URL to
 * an unapproved property returns 404 (never reveals whether it exists
 * but is unauthorized vs truly absent — per API_CONTRACTS.md §2/§19).
 *
 * Never exposes: address, landlord email/phone, internal review data,
 * images.uploadedBy, rejection reasons.
 */
export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let property;
  try {
    property = await getPropertyDetail({ propertyId: id });
  } catch (err) {
    // If the property doesn't exist or isn't approved, return 404.
    // The error could be not_found (property not approved / doesn't exist)
    // or internal_error (DB failure). For not_found, 404 is correct.
    // For internal_error, we still 404 rather than leaking that the
    // property exists but there's a server error.
    if (err && typeof err === "object" && "code" in err && err.code === "not_found") {
      notFound();
    }
    notFound();
  }

  return (
    <main
      id="main-content"
      className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8"
    >
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {property.area}
          </h1>
          {property.isVerified ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
              ✓ Verified
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {property.description}
        </p>
        {property.landlordFirstName ? (
          <p className="mt-1 text-xs text-gray-500">
            Listed by {property.landlordFirstName}
          </p>
        ) : null}
      </header>

      {/* Images */}
      {property.images.length > 0 ? (
        <section aria-label="Property photos" className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">Photos</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {property.images.map((img) => (
              <div
                key={img.id}
                className={`overflow-hidden rounded-md border ${
                  img.isPrimary ? "border-green-500" : "border-gray-200"
                }`}
              >
                {/* In production, this would use next/image with the
                    Supabase Storage public URL. For Phase 6, we show
                    the storage path as a placeholder. */}
                <div className="flex h-32 items-center justify-center bg-gray-100 text-xs text-gray-500">
                  {img.storagePath}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Rooms */}
      <section aria-label="Available rooms">
        <h2 className="mb-4 text-lg font-semibold">Available rooms</h2>
        {property.rooms.length === 0 ? (
          <p className="text-sm text-gray-600">
            No rooms currently available.
          </p>
        ) : (
          <ul className="space-y-4">
            {property.rooms.map((room) => (
              <li
                key={room.id}
                className="rounded-md border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{room.roomType}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Occupancy: {room.occupancy}
                    </p>
                    {room.amenities.length > 0 ? (
                      <p className="mt-1 text-sm text-gray-600">
                        {room.amenities.join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">
                      ₦{Math.floor(room.priceKobo / 100).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">per year</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
