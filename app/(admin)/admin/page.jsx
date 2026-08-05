// app/(admin)/admin/page.jsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '../../../lib/auth'
import { getAdminDashboardMetrics } from '../../../lib/db/queries'
import AdminLayout from '../components/AdminLayout'
import { Users, Building2, FileCheck, ShieldAlert, TrendingUp, ArrowRight } from 'lucide-react'

export default async function AdminOverviewPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const metrics = await getAdminDashboardMetrics()

  const STATS = [
    { label: 'Total Users', value: metrics.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Total Properties', value: metrics.totalProperties, icon: Building2, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Pending KYC', value: metrics.pendingKycCount, icon: FileCheck, color: metrics.pendingKycCount > 0 ? 'text-amber-600' : 'text-gray-900', bg: 'bg-amber-50', href: '/admin/kyc' },
    { label: 'Active Disputes', value: metrics.activeDisputes, icon: ShieldAlert, color: metrics.activeDisputes > 0 ? 'text-red-600' : 'text-gray-900', bg: 'bg-red-50', href: '/admin/disputes' },
  ]

  return (
    <AdminLayout title="Overview" subtitle="Platform-wide metrics and moderation queue">
      <div className="flex flex-col gap-6">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat) => {
            const Icon = stat.icon
            const content = (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 h-full">
                <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              </div>
            )
            return stat.href ? (
              <Link key={stat.label} href={stat.href} className="hover:-translate-y-0.5 transition-transform">
                {content}
              </Link>
            ) : (
              <div key={stat.label}>{content}</div>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Platform Revenue (service fees, confirmed bookings)</p>
              <p className="text-3xl font-bold text-gray-900">₦{metrics.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            This reflects the 7% service fee only — room prices collected are landlord funds held in escrow, not platform revenue.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { href: '/admin/kyc', label: 'Review KYC Submissions', desc: `${metrics.pendingKycCount} pending` },
            { href: '/admin/properties', label: 'Moderate Properties', desc: `${metrics.totalProperties} listed` },
            { href: '/admin/disputes', label: 'Resolve Disputes', desc: `${metrics.activeDisputes} open` },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between bg-white border border-gray-100 hover:border-orange-300 rounded-2xl p-5 transition-colors group"
            >
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
            </Link>
          ))}
        </div>

      </div>
    </AdminLayout>
  )
}