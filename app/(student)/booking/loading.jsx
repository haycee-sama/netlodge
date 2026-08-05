export default function BookingsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-7 w-40 bg-gray-100 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-32 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl shrink-0" />
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-40 bg-gray-100 rounded-lg" />
                  <div className="h-3 w-32 bg-gray-100 rounded-lg" />
                  <div className="h-3 w-24 bg-gray-100 rounded-lg" />
                </div>
              </div>
              <div className="h-6 w-16 bg-gray-100 rounded-lg shrink-0" />
            </div>
            <div className="h-10 bg-gray-100 rounded-xl mt-4" />
          </div>
        ))}
      </div>
    </div>
  )
}