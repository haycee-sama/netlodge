export default function AdminPropertiesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-6 w-48 bg-gray-100 rounded-lg animate-pulse" />
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 animate-pulse">
            <div className="w-9 h-9 rounded-xl bg-gray-100 shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-4 w-40 bg-gray-100 rounded-lg" />
              <div className="h-3 w-24 bg-gray-100 rounded-lg" />
            </div>
            <div className="h-8 w-24 bg-gray-100 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}