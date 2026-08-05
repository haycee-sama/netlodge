// lib/constants/bookingStatus.js
// Shared booking-status display config for the landlord portal.
// LandlordBookingsClient.jsx's full booking list and
// app/landlord/dashboard/page.jsx's "Recent Bookings" widget previously
// each defined an identical status->{label,badge,icon} map.

import { CheckCircle, Clock, XCircle } from 'lucide-react'

export const LANDLORD_BOOKING_STATUS_CONFIG = {
  confirmed: { label: 'Confirmed', badge: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending_payment: { label: 'Pending', badge: 'bg-amber-100 text-amber-700', icon: Clock },
  draft: { label: 'Draft', badge: 'bg-gray-100 text-gray-500', icon: Clock },
  cancelled: { label: 'Cancelled', badge: 'bg-red-100 text-red-600', icon: XCircle },
}