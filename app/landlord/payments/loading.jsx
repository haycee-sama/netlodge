export default function LandlordPaymentsLoading() {
  return (
    <div className="flex flex-col gap-6">

      {/* Revenue stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 animate-pulse">
            <div className="w-12 h-12 bg-gray-100 rounded-xl shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-6 w-24 bg-gray-100 rounded-lg" />
              <div className="h-3 w-20 bg-gray-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Bank notice skeleton */}
      <div className="h-16 bg-gray-100 rounded-2xl animate-pulse" />

      {/* Filter tabs skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 w-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>

      {/* Payments table skeleton */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="h-10 bg-gray-50 border-b border-gray-100" />
        <div className="flex flex-col divide-y divide-gray-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-gray-100 shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-4 w-32 bg-gray-100 rounded-lg" />
                <div className="h-3 w-24 bg-gray-100 rounded-lg" />
              </div>
              <div className="h-4 w-16 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}