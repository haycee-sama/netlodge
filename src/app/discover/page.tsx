import { searchRooms, listUniversities } from "@/server/discovery";
export const dynamic = "force-dynamic";
import { DiscoveryClient } from "./discovery-client";

/**
 * Student discovery page — Phase 6.
 *
 * Public — no authentication required. Shows room listings with filters
 * (university, area, price, room type), sort (price_asc, price_desc,
 * newest), and pagination.
 *
 * The server-side query enforces publication visibility (only approved
 * properties + listed rooms). RLS provides defense-in-depth.
 */
export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // Build the search input from query params.
  const input: Record<string, unknown> = {
    universityId: Array.isArray(params.universityId)
      ? params.universityId[0]
      : params.universityId ?? "00000000-0000-0000-0000-000000000001",
    page: params.page ?? "1",
    pageSize: params.pageSize ?? "10",
    sort: params.sort ?? "newest",
  };

  if (params.area) {
    input.area = Array.isArray(params.area) ? params.area[0] : params.area;
  }
  if (params.minPrice) {
    input.minPrice = Array.isArray(params.minPrice) ? params.minPrice[0] : params.minPrice;
  }
  if (params.maxPrice) {
    input.maxPrice = Array.isArray(params.maxPrice) ? params.maxPrice[0] : params.maxPrice;
  }
  if (params.roomType) {
    input.roomType = Array.isArray(params.roomType) ? params.roomType[0] : params.roomType;
  }

  // Fetch universities for the filter dropdown.
  let universities: Array<{ id: string; name: string; city: string; state: string }> = [];
  try {
    const uniResult = await listUniversities();
    universities = uniResult.universities;
  } catch {
    // If universities can't be loaded, still show the page with an error.
  }

  // Execute the search.
  let result;
  let searchError: string | null = null;
  try {
    result = await searchRooms(input);
  } catch (err) {
    searchError = err instanceof Error ? err.message : "Search failed.";
    result = { items: [], page: 1, pageSize: 10, totalCount: 0 };
  }

  return (
    <main
      id="main-content"
      className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8"
    >
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Find accommodation
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Browse verified rooms near your university.
        </p>
      </header>

      <DiscoveryClient
        universities={universities}
        initialResult={result}
        initialError={searchError}
        currentParams={params as Record<string, string>}
      />
    </main>
  );
}
