"use client";

import { createClient } from "@/lib/supabase/client";
import type { PaymentStatus } from "@/lib/types";

export interface PaymentWithBooking {
  id: string;
  reference: string;
  gateway_reference: string | null;
  booking_id: string;
  student_id: string;
  amount_kobo: number;
  fee_kobo: number;
  net_kobo: number;
  currency: string;
  channel: string;
  status: PaymentStatus;
  confirmed_by_backend: boolean;
  initiated_at: string;
  confirmed_at: string | null;
  failure_reason: string | null;
  receipt_url: string | null;
  bookings?: {
    id: string;
    reference: string;
    property_id: string;
    properties?: { id: string; name: string; slug: string };
  };
}

export interface LandlordPaymentWithRelations extends PaymentWithBooking {
  bookings?: {
    id: string;
    reference: string;
    property_id: string;
    properties?: { id: string; name: string; slug: string; landlord_id: string };
  };
}

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * List payments for the currently authenticated student.
 * RLS restricts to rows where `payments.student_id = auth.uid()`.
 */
export async function fetchStudentPayments(): Promise<ServiceResult<PaymentWithBooking[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        bookings (
          id,
          reference,
          property_id,
          properties ( id, name, slug )
        )
      `)
      .order("initiated_at", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: (data ?? []) as PaymentWithBooking[], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch payments",
    };
  }
}

/**
 * List payments across all properties owned by the currently authenticated landlord.
 * RLS allows landlords to read payments where the booking's property.landlord_id matches auth.uid().
 */
export async function fetchLandlordPayments(): Promise<ServiceResult<LandlordPaymentWithRelations[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        bookings (
          id,
          reference,
          property_id,
          properties ( id, name, slug, landlord_id )
        )
      `)
      .order("initiated_at", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: (data ?? []) as LandlordPaymentWithRelations[], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch landlord payments",
    };
  }
}
