export default function PropertyLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="h-4 w-64 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-4 w-32 bg-gray-100 rounded-lg animate-pulse mb-6" />

        {/* Property header skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 animate-pulse">
          <div className="h-6 w-24 bg-gray-100 rounded-full mb-3" />
          <div className="h-7 w-64 bg-gray-100 rounded-lg mb-3" />
          <div className="h-4 w-96 bg-gray-100 rounded-lg mb-2" />
          <div className="flex gap-2 mt-5 pt-5 border-t border-gray-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-6 w-20 bg-gray-100 rounded-full" />
            ))}
          </div>
        </div>

        {/* Stats bar skeleton */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-20 animate-pulse" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex gap-2 mb-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 w-24 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 bg-white border border-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="h-80 bg-white border border-dashed border-gray-200 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}