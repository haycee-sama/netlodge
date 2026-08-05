// components/shared/EvidenceGallery.jsx
// Shared thumbnail-grid renderer for clickable evidence/document photos
// that open full-size in a new tab. Previously implemented three times
// with only minor visual differences: LandlordBookingsClient.jsx's
// DisputeEvidenceStrip, DisputesQueueClient.jsx's ImageGallery, and
// (structurally) KycQueueClient.jsx's document thumbnails.
//
// variant="strip" -> small square thumbnails in a wrapping row
// variant="grid"  -> larger thumbnails in a responsive grid (default)

export default function EvidenceGallery({ title, images, emptyMessage, variant = 'grid' }) {
  const items = images || []

  if (items.length === 0) {
    if (!emptyMessage) return null
    return (
      <div>
        {title && <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</p>}
        <p className="text-sm text-gray-400">{emptyMessage}</p>
      </div>
    )
  }

  const containerClass = variant === 'strip' ? 'flex flex-wrap gap-2' : 'grid grid-cols-2 sm:grid-cols-3 gap-2'

  const thumbClass =
    variant === 'strip'
      ? 'relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:border-orange-300 transition-colors shrink-0'
      : 'block rounded-lg overflow-hidden border border-gray-200 hover:border-orange-300 transition-colors'

  const imgClass = variant === 'strip' ? 'w-full h-full object-cover' : 'w-full h-28 object-cover'

  return (
    <div>
      {title && (
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {title} ({items.length})
        </p>
      )}
      <div className={containerClass}>
        {items.map((file, index) => (
          
          <a key={`${file.url}-${index}`}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className={thumbClass}
            aria-label={`Open ${title ? title.toLowerCase() : 'photo'} ${index + 1} of ${items.length} in a new tab`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={file.url} alt={file.name || file.alt || `Photo ${index + 1}`} className={imgClass} />
          </a>
        ))}
      </div>
    </div>
  )
}