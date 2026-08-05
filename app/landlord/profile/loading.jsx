export default function LandlordProfileLoading() {
  return (
    <div className="max-w-3xl flex flex-col gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4 animate-pulse">
          <div className="h-5 w-48 bg-gray-100 rounded-lg mb-2" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-11 bg-gray-100 rounded-xl" />
            <div className="h-11 bg-gray-100 rounded-xl" />
          </div>
          <div className="flex justify-end">
            <div className="h-10 w-32 bg-gray-100 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}