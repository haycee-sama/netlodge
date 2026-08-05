export default function LandlordRoomsLoading() {
  return (
    <div className="flex flex-col gap-6">

      <div className="flex items-center justify-between animate-pulse">
        <div className="h-4 w-40 bg-gray-100 rounded-lg" />
        <div className="flex gap-3">
          <div className="h-10 w-32 bg-gray-100 rounded-xl" />
          <div className="h-10 w-28 bg-gray-100 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-2xl h-20" />
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 w-28 bg-gray-100 rounded-xl shrink-0" />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="h-32 bg-gray-100" />
            <div className="p-4 flex flex-col gap-3">
              <div className="h-4 w-24 bg-gray-100 rounded-lg" />
              <div className="h-3 w-32 bg-gray-100 rounded-lg" />
              <div className="h-9 bg-gray-100 rounded-xl mt-2" />
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}