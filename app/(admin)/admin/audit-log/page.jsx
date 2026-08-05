// app/(admin)/admin/audit-log/page.jsx
import { redirect } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { auth } from '../../../../lib/auth'

export default async function AdminAuditLogPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 text-sm mt-1">A searchable history of admin actions</p>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <ClipboardList className="w-7 h-7 text-gray-400" />
        </div>
        <h3 className="font-bold text-gray-900 mb-2">Coming soon</h3>
        <p className="text-gray-500 text-sm max-w-sm">
          A full audit log of KYC approvals, property verification changes, and dispute resolutions,
          filterable by admin, action type, and date, will be built here.
        </p>
      </div>
    </div>
  )
}