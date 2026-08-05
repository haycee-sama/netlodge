export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          <aside className="w-full lg:w-64 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
              <div className="flex items-center gap-3 px-2 py-3 mb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3 w-24 bg-gray-100 rounded-lg" />
                  <div className="h-3 w-32 bg-gray-100 rounded-lg" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-xl" />
                ))}
              </div>
            </div>
          </aside>

          <main className="flex-1 flex flex-col gap-6">

            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-2">
                <div className="h-7 w-56 bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-4 w-40 bg-gray-100 rounded-lg animate-pulse" />
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-xl animate-pulse" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                  <div className="h-6 w-12 bg-gray-100 rounded-lg" />
                  <div className="h-3 w-20 bg-gray-100 rounded-lg" />
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="h-5 w-40 bg-gray-100 rounded-lg mb-5" />
              <div className="h-32 bg-gray-100 rounded-xl" />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="h-5 w-32 bg-gray-100 rounded-lg mb-5" />
              <div className="flex flex-col gap-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-xl" />
                ))}
              </div>
            </div>

          </main>
        </div>
      </div>
    </div>
  )
}