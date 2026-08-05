export default function AdminDisputesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-6 w-48 bg-gray-100 rounded-lg animate-pulse" />
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
          <div className="h-4 w-56 bg-gray-100 rounded-lg mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-28 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}