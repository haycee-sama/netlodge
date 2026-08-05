// app/(student)/booking/success/page.jsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle, ShieldCheck, MapPin, Building2,
  Download, ArrowRight,
} from 'lucide-react'
import { auth } from '../../../../lib/auth'
import { getBookingById } from '../../../../lib/db/queries'
import { finalizeConfirmedBooking } from '../../../../lib/actions/booking'
import BookingProgress from '../components/BookingProgress'
import SuccessClient from './SuccessClient'

export default async function BookingSuccessPage({ searchParams }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'student') redirect('/login')

  const params = await searchParams
  const bookingId = params?.bookingId
  // Paystack's callback appends both — either name may be present depending on integration path.
  const reference = params?.reference || params?.trxref
  if (!bookingId) redirect('/dashboard')

  let booking = await getBookingById(bookingId)
  if (!booking || booking.studentId !== session.user.roleRecordId) redirect('/dashboard')

  // Fallback path: Paystack's browser redirect can arrive before the
  // webhook does. If the booking isn't confirmed yet and Paystack gave
  // us a reference, verify synchronously — independently re-checked
  // with Paystack, never trusted from the URL alone.
  if (booking.status !== 'confirmed' && reference) {
    await finalizeConfirmedBooking(reference)
    booking = await getBookingById(bookingId)
  }

  if (!booking || booking.status !== 'confirmed') {
    return <SuccessClient bookingId={bookingId} reference={reference} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BookingProgress step={2} />

      <div className="bg-green-500 text-white py-14 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Booking Confirmed!</h1>
          <p className="text-green-100 text-lg mb-4">Your room has been successfully booked and your payment is in escrow.</p>
          <div className="inline-flex items-center gap-3 bg-white/20 border border-white/30 rounded-xl px-5 py-3">
            <span className="text-sm text-green-100">Booking Reference</span>
            <span className="font-mono font-bold text-white text-lg">{booking.bookingRef}</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-6">

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-5">Booking Summary</h2>
          <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="w-8 h-8 text-gray-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-900">Room {booking.room?.number} — {booking.room?.type}</h3>
                <div className="flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </div>
              </div>
              <p className="text-sm text-gray-600">{booking.property?.name} · {booking.blockName}</p>
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                <MapPin className="w-3 h-3" />
                {booking.property?.city}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Move-In Date', value: booking.moveInDate },
              { label: 'Lease Ends', value: booking.leaseEndDate },
              { label: 'Lease Type', value: booking.leaseType },
              { label: 'Room Type', value: booking.room?.type },
              { label: 'Bathroom', value: booking.room?.bathroom },
              { label: 'Payment', value: 'Paid' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-800">{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Room price</span>
              <span className="font-medium text-gray-800">₦{booking.roomPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Service fee (7%)</span>
              <span className="font-medium text-gray-800">₦{booking.serviceFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t border-orange-100 text-base">
              <span className="text-gray-900">Total Paid</span>
              <span className="text-orange-500">₦{booking.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-1">48-Hour Escrow Window is Now Open</p>
              <p className="text-sm text-blue-700 leading-relaxed">
                Your payment of <strong>₦{booking.totalAmount.toLocaleString()}</strong> is held in escrow.
                Visit the room within 48 hours. If it does not match the listing, file a dispute before the window closes.
              </p>
              <Link href="/booking" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline mt-3">
                Go to My Bookings <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-colors"
          >
            Go to My Dashboard
            <ArrowRight className="w-5 h-5" />
          </Link>
          <button className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-700 font-bold py-4 rounded-xl transition-colors">
            <Download className="w-5 h-5" />
            Download Receipt
          </button>
        </div>

        <p className="text-center text-sm text-gray-500">
          Need help?{' '}
          <Link href="/contact" className="text-orange-500 hover:underline font-medium">Contact Support</Link>
        </p>

      </div>
    </div>
  )
}