// app/(student)/booking/confirm/page.jsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { auth } from '../../../../lib/auth'
import { getRoomById } from '../../../../lib/db/queries'
import BookingProgress from '../components/BookingProgress'
import ConfirmClient from './ConfirmClient'

export default async function BookingConfirmPage({ searchParams }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'student') redirect('/login')

  const params = await searchParams
  const roomId = params?.roomId
  const leaseLabel = params?.lease || '1 Year'

  if (!roomId) {
    return (
      <>
        <BookingProgress step={0} />
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-center px-4">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <h2 className="text-xl font-bold text-gray-900">No room selected</h2>
          <p className="text-gray-500 text-sm">Please go back and select a room before proceeding to checkout.</p>
          <Link href="/search" className="bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors">
            Back to Search
          </Link>
        </div>
      </>
    )
  }

  const result = await getRoomById(roomId)

  if (!result || result.room.status !== 'Available') {
    return (
      <>
        <BookingProgress step={0} />
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-center px-4">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <h2 className="text-xl font-bold text-gray-900">Room unavailable</h2>
          <p className="text-gray-500 text-sm">This room could not be found or is no longer available.</p>
          <Link href="/search" className="bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors">
            Back to Search
          </Link>
        </div>
      </>
    )
  }

  return <ConfirmClient room={result.room} block={result.block} property={result.property} initialLeaseLabel={leaseLabel} />
}