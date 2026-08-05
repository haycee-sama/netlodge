// app/(admin)/admin/page.jsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '../../../lib/auth'
import { getAdminDashboardMetrics } from '../../../lib/actions/admin'
import {
  Users, FileCheck, ShieldAlert, Building2, TrendingUp, ArrowRight, AlertTriangle,
} from 'lucide-react'

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const metrics = await getAdminDashboardMetrics()
  if ('error' in metrics) redirect('/login')

  const needsAttention = metrics.staleKycCount > 0 || metrics.unverifiedPropertiesWithAvailableRooms > 0 || metrics.openDisputesCount > 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Platform overview and items that need your attention</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-5">
          <AlertTriangle className={`w-5 h-5 ${needsAttention ? 'text-amber-500' : 'text-gray-400'}`} />
          <h2 className="font-bold text-gray-900 text-lg">Attention Required</h2>
        </div>

        {needsAttention ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/admin/kyc"
              className={`flex flex-col gap-2 rounded-xl border p-4 transition-colors ${
                metrics.staleKycCount > 0 ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <FileCheck className={`w-5 h-5 ${metrics.staleKycCount > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
                <span className="text-2xl font-bold text-gray-900">{metrics.staleKycCount}</span>
              </div>
              <p className="text-sm font-semibold text-gray-800">KYC pending over 24 hours</p>
            </Link>

            <Link
              href="/admin/properties"
              className={`flex flex-col gap-2 rounded-xl border p-4 transition-colors ${
                metrics.unverifiedPropertiesWithAvailableRooms > 0 ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <Building2 className={`w-5 h-5 ${metrics.unverifiedPropertiesWithAvailableRooms > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
                <span className="text-2xl font-bold text-gray-900">{metrics.unverifiedPropertiesWithAvailableRooms}</span>
              </div>
              <p className="text-sm font-semibold text-gray-800">Unverified properties with live rooms</p>
            </Link>

            <Link
              href="/admin/disputes"
              className={`flex flex-col gap-2 rounded-xl border p-4 transition-colors ${
                metrics.openDisputesCount > 0 ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <ShieldAlert className={`w-5 h-5 ${metrics.openDisputesCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                <span className="text-2xl font-bold text-gray-900">{metrics.openDisputesCount}</span>
              </div>
              <p className="text-sm font-semibold text-gray-800">Open disputes</p>
            </Link>
          </div>
        ) : (
          <p className="text-sm text-gray-500 py-4 text-center">Nothing needs attention right now. All queues are clear.</p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: metrics.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Students', value: metrics.totalStudents, icon: Users, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'Landlords', value: metrics.totalLandlords, icon: Building2, color: 'text-purple-500', bg: 'bg-purple-50' },
          { label: 'Platform Revenue', value: `₦${metrics.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3">
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/kyc" className="flex items-center gap-2 text-sm font-semibold text-orange-500 hover:underline">
          Go to KYC Queue <ArrowRight className="w-4 h-4" />
        </Link>
        <Link href="/admin/properties" className="flex items-center gap-2 text-sm font-semibold text-orange-500 hover:underline">
          Go to Properties <ArrowRight className="w-4 h-4" />
        </Link>
        <Link href="/admin/disputes" className="flex items-center gap-2 text-sm font-semibold text-orange-500 hover:underline">
          Go to Disputes <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}