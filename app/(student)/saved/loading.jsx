export default function SavedRoomsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-7 w-40 bg-gray-100 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-28 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
              <div className="h-44 bg-gray-100" />
              <div className="p-5 flex flex-col gap-3">
                <div className="h-3 w-24 bg-gray-100 rounded-lg" />
                <div className="h-4 w-full bg-gray-100 rounded-lg" />
                <div className="h-3 w-32 bg-gray-100 rounded-lg" />
                <div className="h-10 bg-gray-100 rounded-xl mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}