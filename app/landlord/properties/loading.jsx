export default function LandlordPropertiesLoading() {
  return (
    <div className="flex flex-col gap-6">

      <div className="flex items-center justify-between animate-pulse">
        <div className="h-4 w-64 bg-gray-100 rounded-lg" />
        <div className="h-10 w-36 bg-gray-100 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-48 h-36 sm:h-auto bg-gray-100 shrink-0" />
              <div className="flex-1 p-5 flex flex-col gap-3">
                <div className="h-5 w-48 bg-gray-100 rounded-lg" />
                <div className="h-3 w-32 bg-gray-100 rounded-lg" />
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-14 bg-gray-100 rounded-xl" />
                  ))}
                </div>
                <div className="h-10 w-40 bg-gray-100 rounded-xl mt-2" />
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}