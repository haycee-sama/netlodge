export default function LandlordKycLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-md flex flex-col gap-4 animate-pulse">
        <div className="h-6 w-40 bg-gray-100 rounded-lg mx-auto mb-4" />
        <div className="bg-white rounded-2xl border border-gray-100 p-8 flex flex-col gap-5">
          <div className="h-4 w-full bg-gray-100 rounded-lg" />
          <div className="h-24 bg-gray-100 rounded-xl" />
          <div className="h-24 bg-gray-100 rounded-xl" />
          <div className="h-24 bg-gray-100 rounded-xl" />
          <div className="h-11 bg-gray-100 rounded-xl mt-2" />
        </div>
      </div>
    </div>
  )
}