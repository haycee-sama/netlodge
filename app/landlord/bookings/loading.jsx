export default function LandlordBookingsLoading() {
  return (
    <div className="flex flex-col gap-6">

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
            <div className="h-7 w-16 bg-gray-100 rounded-lg mb-2" />
            <div className="h-3 w-20 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Search + filter bar skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 h-12 bg-gray-100 rounded-xl animate-pulse" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-11 w-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>

      {/* Booking rows skeleton */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-4 w-32 bg-gray-100 rounded-lg" />
                <div className="h-3 w-48 bg-gray-100 rounded-lg" />
              </div>
              <div className="h-6 w-20 bg-gray-100 rounded-full shrink-0" />
              <div className="h-4 w-16 bg-gray-100 rounded-lg shrink-0" />
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}