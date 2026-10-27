/**
 * Database types generated from the NetLodge Supabase schema.
 *
 * These types map to the database tables created in supabase/migrations/.
 * In production, regenerate with: npx supabase gen types --project-id psmjjypiulliudepiurx
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          phone_verified: boolean;
          avatar_path: string | null;
          bio: string | null;
          status: "active" | "suspended" | "deactivated";
          status_reason: string | null;
          status_changed_by: string | null;
          status_changed_at: string | null;
          role_updated_at: string | null;
          role_changed_by: string | null;
          profile_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name?: string;
          last_name?: string;
          phone?: string | null;
          status?: "active" | "suspended" | "deactivated";
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          assigned_by: string | null;
          assigned_at: string;
          reason: string | null;
        };
        Insert: {
          user_id: string;
          role: string;
          assigned_by?: string | null;
          reason?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["user_roles"]["Insert"]>;
      };
      universities: {
        Row: {
          id: string;
          slug: string;
          name: string;
          short_name: string;
          city: string;
          state: string;
          latitude: number | null;
          longitude: number | null;
          description: string | null;
          logo_path: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["universities"]["Row"]> & {
          slug: string;
          name: string;
          short_name: string;
          city: string;
          state: string;
        };
        Update: Partial<Database["public"]["Tables"]["universities"]["Insert"]>;
      };
      neighbourhoods: {
        Row: {
          id: string;
          slug: string;
          name: string;
          city: string;
          state: string;
          university_id: string | null;
          average_annual_rent_kobo: number | null;
          walking_minutes_to_campus: number | null;
          image_path: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["neighbourhoods"]["Row"]> & {
          slug: string;
          name: string;
          city: string;
          state: string;
        };
        Update: Partial<Database["public"]["Tables"]["neighbourhoods"]["Insert"]>;
      };
      properties: {
        Row: {
          id: string;
          slug: string;
          landlord_id: string;
          name: string;
          description: string;
          type: string;
          status: string;
          verification_status: string;
          city: string;
          state: string;
          neighbourhood_id: string | null;
          university_id: string | null;
          public_address_line: string;
          private_address_line: string;
          latitude: number | null;
          longitude: number | null;
          total_floors: number;
          total_units: number;
          available_units: number;
          occupied_units: number;
          held_units: number;
          price_from_kobo: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["properties"]["Row"]> & {
          slug: string;
          landlord_id: string;
          name: string;
          type: string;
          city: string;
          state: string;
          public_address_line: string;
          private_address_line: string;
        };
        Update: Partial<Database["public"]["Tables"]["properties"]["Insert"]>;
      };
      floors: {
        Row: {
          id: string;
          property_id: string;
          label: string;
          level: number;
          description: string | null;
          default_price_kobo: number | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["floors"]["Row"]> & {
          property_id: string;
          label: string;
          level: number;
        };
        Update: Partial<Database["public"]["Tables"]["floors"]["Insert"]>;
      };
      rentable_units: {
        Row: {
          id: string;
          identifier: string;
          slug: string | null;
          property_id: string;
          floor_id: string | null;
          unit_type: string;
          status: string;
          capacity: number;
          bedrooms: number;
          bathrooms: number;
          has_balcony: boolean;
          has_window: boolean;
          size_sqm: number | null;
          furnishing: string;
          representative_images_only: boolean;
          annual_rent_kobo: number;
          rental_period: string;
          caution_deposit_kobo: number | null;
          available_from: string | null;
          available_to: string | null;
          booking_terms: string | null;
          active_hold_id: string | null;
          active_booking_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["rentable_units"]["Row"]> & {
          identifier: string;
          property_id: string;
          unit_type: string;
          annual_rent_kobo: number;
        };
        Update: Partial<Database["public"]["Tables"]["rentable_units"]["Insert"]>;
      };
      bookings: {
        Row: {
          id: string;
          reference: string;
          student_id: string;
          property_id: string;
          rentable_unit_id: string;
          status: string;
          current_step: string;
          check_in: string;
          check_out: string;
          rental_period: string;
          base_rent_kobo: number;
          additional_charges_kobo: number;
          caution_deposit_kobo: number;
          service_fee_kobo: number;
          total_kobo: number;
          paid_kobo: number;
          outstanding_kobo: number;
          hold_expires_at: string | null;
          confirmed_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["bookings"]["Row"]> & {
          reference: string;
          student_id: string;
          property_id: string;
          rentable_unit_id: string;
          check_in: string;
          check_out: string;
          total_kobo: number;
          outstanding_kobo: number;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
      };
      payments: {
        Row: {
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
          status: string;
          confirmed_by_backend: boolean;
          initiated_at: string;
          confirmed_at: string | null;
          failure_reason: string | null;
          receipt_url: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["payments"]["Row"]> & {
          reference: string;
          booking_id: string;
          student_id: string;
          amount_kobo: number;
          net_kobo: number;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
      payouts: {
        Row: {
          id: string;
          reference: string;
          landlord_id: string;
          booking_id: string;
          gross_kobo: number;
          platform_fee_kobo: number;
          net_kobo: number;
          status: string;
          settled_at: string | null;
          bank_account_masked: string;
          scheduled_for: string;
          approved_by: string | null;
          approved_at: string | null;
          rejection_reason: string | null;
          reversal_reason: string | null;
          provider_reference: string | null;
          eligibility_flags: string[];
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payouts"]["Row"]> & {
          reference: string;
          landlord_id: string;
          booking_id: string;
          gross_kobo: number;
          platform_fee_kobo: number;
          net_kobo: number;
          bank_account_masked: string;
          scheduled_for: string;
        };
        Update: Partial<Database["public"]["Tables"]["payouts"]["Insert"]>;
      };
      refunds: {
        Row: {
          id: string;
          reference: string;
          payment_id: string;
          payment_reference: string;
          booking_id: string;
          student_id: string;
          amount_kobo: number;
          currency: string;
          reason: string;
          reason_detail: string;
          status: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_notes: string | null;
          provider_reference: string | null;
          completed_at: string | null;
          failure_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["refunds"]["Row"]> & {
          reference: string;
          payment_id: string;
          payment_reference: string;
          booking_id: string;
          student_id: string;
          amount_kobo: number;
          reason: string;
          reason_detail: string;
        };
        Update: Partial<Database["public"]["Tables"]["refunds"]["Insert"]>;
      };
      verification_cases: {
        Row: {
          id: string;
          reference: string;
          entity_type: string;
          entity_id: string;
          entity_label: string;
          submission_type: string;
          status: string;
          priority: string;
          assigned_officer_id: string | null;
          sla_due_at: string | null;
          submitted_at: string | null;
          reviewed_at: string | null;
          reviewer_id: string | null;
          review_notes: string | null;
          rejection_reason: string | null;
          escalated_from: string | null;
          escalated_to: string | null;
          escalated_at: string | null;
          escalation_reason: string | null;
          outstanding_actions: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["verification_cases"]["Row"]> & {
          reference: string;
          entity_type: string;
          entity_id: string;
          entity_label: string;
          submission_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["verification_cases"]["Insert"]>;
      };
      support_tickets: {
        Row: {
          id: string;
          reference: string;
          user_id: string;
          subject: string;
          category: string;
          priority: string;
          status: string;
          message: string;
          assigned_to: string | null;
          team: string | null;
          first_response_at: string | null;
          resolved_at: string | null;
          sla_due_at: string | null;
          escalated: boolean;
          escalated_to: string | null;
          escalated_reason: string | null;
          related_booking_id: string | null;
          related_payment_reference: string | null;
          related_property_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["support_tickets"]["Row"]> & {
          reference: string;
          user_id: string;
          subject: string;
          category: string;
          message: string;
        };
        Update: Partial<Database["public"]["Tables"]["support_tickets"]["Insert"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          timestamp: string;
          actor_id: string | null;
          actor_email: string;
          actor_role: string;
          category: string;
          action: string;
          resource_type: string;
          resource_id: string;
          summary: string;
          severity: string;
          ip_address: string | null;
          user_agent: string | null;
          before_data: Record<string, unknown> | null;
          after_data: Record<string, unknown> | null;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]> & {
          actor_email: string;
          actor_role: string;
          category: string;
          action: string;
          resource_type: string;
          resource_id: string;
          summary: string;
        };
        Update: never; // Audit logs are immutable
      };
      platform_settings: {
        Row: {
          id: string;
          key: string;
          label: string;
          description: string;
          type: string;
          value: string;
          unit: string | null;
          category: string;
          requires_reauth: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["platform_settings"]["Row"]> & {
          key: string;
          label: string;
          type: string;
          value: string;
          category: string;
        };
        Update: Partial<Database["public"]["Tables"]["platform_settings"]["Insert"]>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          href: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          user_id: string;
          type: string;
          title: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };
      saved_properties: {
        Row: {
          id: string;
          user_id: string;
          property_id: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["saved_properties"]["Row"]> & {
          user_id: string;
          property_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["saved_properties"]["Insert"]>;
      };
    };
    Functions: {
      handle_new_user: { Args: Record<string, never>; Returns: unknown };
      get_user_roles: { Args: { p_user_id: string }; Returns: string[] };
      has_role: { Args: { p_user_id: string; p_role: string }; Returns: boolean };
      is_admin: { Args: { p_user_id: string }; Returns: boolean };
      can_access_property: { Args: { p_user_id: string; p_property_id: string }; Returns: boolean };
      create_booking: { Args: Record<string, unknown>; Returns: string };
      confirm_booking: { Args: { p_booking_id: string }; Returns: void };
      cancel_booking: { Args: { p_booking_id: string; p_reason: string }; Returns: void };
      record_audit: { Args: Record<string, unknown>; Returns: string };
    };
  };
}

export type DatabaseTables = Database["public"]["Tables"];
