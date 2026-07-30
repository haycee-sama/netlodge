export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-7 w-40 bg-gray-100 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-56 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar skeleton */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 h-96 animate-pulse" />
          </aside>

          {/* Results skeleton */}
          <div className="flex-1 flex flex-col gap-5">
            <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col sm:flex-row animate-pulse"
              >
                <div className="sm:w-56 h-48 sm:h-auto bg-gray-100 shrink-0" />
                <div className="flex-1 p-5 flex flex-col gap-3">
                  <div className="h-5 w-3/4 bg-gray-100 rounded-lg" />
                  <div className="h-3 w-1/2 bg-gray-100 rounded-lg" />
                  <div className="flex gap-2">
                    <div className="h-6 w-16 bg-gray-100 rounded-full" />
                    <div className="h-6 w-16 bg-gray-100 rounded-full" />
                  </div>
                  <div className="h-16 bg-gray-100 rounded-xl mt-auto" />
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}