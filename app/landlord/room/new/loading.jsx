export default function CreateRoomLoading() {
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4 animate-pulse">
          <div className="h-5 w-40 bg-gray-100 rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-11 bg-gray-100 rounded-xl" />
            <div className="h-11 bg-gray-100 rounded-xl" />
          </div>
          <div className="h-24 bg-gray-100 rounded-xl" />
        </div>
      ))}
      <div className="flex justify-end">
        <div className="h-11 w-40 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}