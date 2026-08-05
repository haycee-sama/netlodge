export default function CreatePropertyLoading() {
  return (
    <div className="max-w-2xl mx-auto">

      <div className="flex items-center gap-2 mb-8 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-100" />
            <div className="h-3 w-20 bg-gray-100 rounded-lg hidden sm:block" />
            {i < 2 && <div className="h-0.5 w-8 sm:w-12 bg-gray-100" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-5 animate-pulse">
        <div className="h-5 w-48 bg-gray-100 rounded-lg" />
        <div className="h-3 w-64 bg-gray-100 rounded-lg" />
        <div className="h-11 bg-gray-100 rounded-xl" />
        <div className="h-11 bg-gray-100 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-11 bg-gray-100 rounded-xl" />
          <div className="h-11 bg-gray-100 rounded-xl" />
        </div>
        <div className="flex justify-end">
          <div className="h-11 w-48 bg-gray-100 rounded-xl" />
        </div>
      </div>

    </div>
  )
}