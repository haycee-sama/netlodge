// app/components/PropertyCardSkeleton.jsx
// Shimmer skeleton placeholder shown while search results are filtering.
// Matches the exact shape of a property card so there is no layout shift
// when real cards replace the skeletons.

export default function PropertyCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col sm:flex-row">
      {/* Image area */}
      <div className="sm:w-56 h-48 sm:h-auto shrink-0 skeleton" />

      {/* Content area */}
      <div className="flex-1 p-5 flex flex-col gap-3">
        {/* Badge + title row */}
        <div className="flex items-center gap-2">
          <div className="skeleton h-6 w-20 rounded-full" />
          <div className="skeleton h-6 w-16 rounded-full" />
        </div>

        {/* Title */}
        <div className="skeleton h-6 w-3/4 rounded-lg" />
        {/* Location */}
        <div className="skeleton h-4 w-1/2 rounded-lg" />
        {/* Distance */}
        <div className="skeleton h-4 w-1/3 rounded-lg" />

        {/* Room type chips */}
        <div className="flex gap-2 mt-1">
          <div className="skeleton h-6 w-24 rounded-full" />
          <div className="skeleton h-6 w-20 rounded-full" />
        </div>

        {/* Amenity chips */}
        <div className="flex gap-2 flex-wrap">
          <div className="skeleton h-6 w-20 rounded-full" />
          <div className="skeleton h-6 w-24 rounded-full" />
          <div className="skeleton h-6 w-16 rounded-full" />
        </div>

        {/* Bottom row — stats + price */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <div className="flex gap-4">
            <div className="skeleton h-4 w-24 rounded-lg" />
            <div className="skeleton h-4 w-16 rounded-lg" />
          </div>
          <div className="skeleton h-9 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
