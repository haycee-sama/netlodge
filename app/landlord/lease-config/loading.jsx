export default function LeaseConfigLoading() {
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">

      <div className="h-16 bg-gray-100 rounded-2xl animate-pulse" />

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4 animate-pulse">
          <div className="h-5 w-56 bg-gray-100 rounded-lg" />
          <div className="h-3 w-full bg-gray-100 rounded-lg" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-16 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <div className="h-11 w-44 bg-gray-100 rounded-xl animate-pulse" />
      </div>

    </div>
  )
}