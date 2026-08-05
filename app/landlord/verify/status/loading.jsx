export default function LandlordVerifyStatusLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg flex flex-col gap-4 animate-pulse">
        <div className="h-6 w-32 bg-gray-100 rounded-lg mx-auto mb-4" />
        <div className="bg-white rounded-2xl border border-gray-100 p-8 flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl" />
          <div className="h-4 w-24 bg-gray-100 rounded-full" />
          <div className="h-6 w-56 bg-gray-100 rounded-lg" />
          <div className="h-3 w-full bg-gray-100 rounded-lg" />
          <div className="h-11 w-full bg-gray-100 rounded-xl mt-2" />
        </div>
      </div>
    </div>
  )
}