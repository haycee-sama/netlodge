export default function AdminKycLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-6 w-48 bg-gray-100 rounded-lg animate-pulse" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="flex flex-col gap-2">
              <div className="h-4 w-40 bg-gray-100 rounded-lg" />
              <div className="h-3 w-56 bg-gray-100 rounded-lg" />
            </div>
            <div className="h-6 w-20 bg-gray-100 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-32 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}