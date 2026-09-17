"use client";

import Link from "next/link";
import type { SearchRoomsResult } from "@/lib/discovery";

/**
 * Discovery client component — handles filter form state + renders results.
 *
 * Phase 6 — minimal placeholder UI. Visual polish belongs to a later phase.
 * The component receives initial data from the Server Component and
 * builds filter/sort/pagination links via URL search params (progressive
 * enhancement — works without JavaScript).
 */

interface DiscoveryClientProps {
  universities: Array<{ id: string; name: string; city: string; state: string }>;
  initialResult: SearchRoomsResult;
  initialError: string | null;
  currentParams: Record<string, string>;
}

export function DiscoveryClient({
  universities,
  initialResult,
  initialError,
  currentParams,
}: DiscoveryClientProps) {
  const { items, page, pageSize, totalCount } = initialResult;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Build a URL search string from the current params + overrides.
  function buildQuery(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    const merged = { ...currentParams, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined && value !== "") {
        params.set(key, value);
      }
    }
    return params.toString();
  }

  return (
    <div>
      {/* Filters */}
      <section
        aria-label="Filters"
        className="mb-8 rounded-md border border-gray-200 p-4"
      >
        <form method="get" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="universityId" className="block text-sm font-medium">
              University
            </label>
            <select
              id="universityId"
              name="universityId"
              defaultValue={currentParams.universityId ?? ""}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
            >
              {universities.map((uni) => (
                <option key={uni.id} value={uni.id}>
                  {uni.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="area" className="block text-sm font-medium">
              Area
            </label>
            <input
              id="area"
              name="area"
              type="text"
              defaultValue={currentParams.area ?? ""}
              placeholder="e.g. Akoka"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
            />
          </div>
          <div>
            <label htmlFor="minPrice" className="block text-sm font-medium">
              Min Price (₦)
            </label>
            <input
              id="minPrice"
              name="minPrice"
              type="number"
              min="0"
              defaultValue={currentParams.minPrice ?? ""}
              placeholder="0"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
            />
          </div>
          <div>
            <label htmlFor="maxPrice" className="block text-sm font-medium">
              Max Price (₦)
            </label>
            <input
              id="maxPrice"
              name="maxPrice"
              type="number"
              min="0"
              defaultValue={currentParams.maxPrice ?? ""}
              placeholder="100000"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
            />
          </div>
          <div>
            <label htmlFor="roomType" className="block text-sm font-medium">
              Room Type
            </label>
            <input
              id="roomType"
              name="roomType"
              type="text"
              defaultValue={currentParams.roomType ?? ""}
              placeholder="self-contain, shared..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
            />
          </div>
          <div>
            <label htmlFor="sort" className="block text-sm font-medium">
              Sort
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={currentParams.sort ?? "newest"}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Search
            </button>
          </div>
        </form>
      </section>

      {/* Error */}
      {initialError ? (
        <p role="alert" className="rounded-md bg-red-50 p-4 text-red-700">
          {initialError}
        </p>
      ) : null}

      {/* Results */}
      {items.length === 0 && !initialError ? (
        <p className="rounded-md border border-gray-200 p-8 text-center text-gray-600">
          No rooms found matching your filters.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((room) => (
            <li key={room.roomId}>
              <Link
                href={`/properties/${room.propertyId}`}
                className="block rounded-md border border-gray-200 p-4 hover:border-gray-400"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {room.roomType} in {room.area}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {room.description.slice(0, 120)}
                      {room.description.length > 120 ? "…" : ""}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      Occupancy: {room.occupancy} ·{" "}
                      {room.amenities.length > 0
                        ? room.amenities.join(", ")
                        : "No amenities listed"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      ₦{Math.floor(room.priceKobo / 100).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">per year</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {totalPages > 1 ? (
        <nav
          aria-label="Pagination"
          className="mt-8 flex items-center justify-center gap-4"
        >
          {page > 1 ? (
            <Link
              href={`/discover?${buildQuery({ page: String(page - 1) })}`}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              ← Previous
            </Link>
          ) : null}
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages} ({totalCount} results)
          </span>
          {page < totalPages ? (
            <Link
              href={`/discover?${buildQuery({ page: String(page + 1) })}`}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              Next →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
