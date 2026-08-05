export default function LandlordDashboardLoading() {
  return (
    <div className="flex flex-col gap-6">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 animate-pulse">
            <div className="w-10 h-10 bg-gray-100 rounded-xl" />
            <div className="h-6 w-12 bg-gray-100 rounded-lg" />
            <div className="h-3 w-20 bg-gray-100 rounded-lg" />
            <div className="h-3 w-24 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
            <div className="h-5 w-32 bg-gray-100 rounded-lg mb-5" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl" />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
            <div className="h-5 w-36 bg-gray-100 rounded-lg mb-5" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
            <div className="h-5 w-28 bg-gray-100 rounded-lg mb-4" />
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="bg-gray-100 rounded-2xl p-5 h-40 animate-pulse" />
        </div>
      </div>

    </div>
  )
}