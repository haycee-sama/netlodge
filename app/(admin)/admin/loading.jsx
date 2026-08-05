export default function AdminDashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-6 w-56 bg-gray-100 rounded-lg animate-pulse" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 animate-pulse">
            <div className="w-10 h-10 bg-gray-100 rounded-xl" />
            <div className="h-6 w-12 bg-gray-100 rounded-lg" />
            <div className="h-3 w-32 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 animate-pulse">
            <div className="h-6 w-16 bg-gray-100 rounded-lg" />
            <div className="h-3 w-24 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}