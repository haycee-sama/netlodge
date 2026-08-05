// components/shared/EmptyState.jsx
// Generic "nothing here yet" block: icon in a rounded gray box, bold
// title, muted description. This exact pattern was copy-pasted across
// LandlordPaymentsClient.jsx, LandlordBookingsClient.jsx,
// DisputesQueueClient.jsx (admin), and KycQueueClient.jsx (admin).

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-gray-400" />
        </div>
      )}
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-gray-500 text-sm max-w-xs">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}