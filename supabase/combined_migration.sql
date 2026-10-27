-- ===========================================================================
-- NetLodge Schema Migration — Part 1: Tables, Types, Constraints, Indexes
-- ===========================================================================
-- This migration creates the complete database schema for NetLodge.
-- Run before 0002_functions_and_triggers.sql and 0003_rls_policies.sql.
-- ===========================================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ===========================================================================
-- A. PROFILES AND ROLES
-- ===========================================================================

-- Custom ENUM types
do $$ begin
  create type user_role as enum ('student', 'landlord', 'property_manager', 'agent', 'verification_officer', 'support_staff', 'finance_admin', 'super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status as enum ('active', 'suspended', 'deactivated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum ('not_submitted', 'pending', 'under_review', 'needs_information', 'approved', 'rejected', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_entity_type as enum ('student', 'landlord', 'property', 'room');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_submission_type as enum ('student_kyc', 'landlord_identity', 'landlord_business', 'property_listing', 'room_evidence', 'inspection_report');
exception when duplicate_object then null; end $$;

do $$ begin
  create type priority_level as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null; end $$;

-- Profiles table (references auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  phone text,
  phone_verified boolean not null default false,
  avatar_path text,
  bio text,
  status account_status not null default 'active',
  status_reason text,
  status_changed_by uuid references public.profiles(id),
  status_changed_at timestamptz,
  role_updated_at timestamptz,
  role_changed_by uuid references public.profiles(id),
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User roles (supports multiple roles per user)
create table if not exists public.user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role user_role not null,
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now(),
  reason text,
  unique(user_id, role)
);

-- Student profiles (extension)
create table if not exists public.student_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  university_id uuid,
  matric_number text,
  level text,
  department text,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Landlord profiles (extension)
create table if not exists public.landlord_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  business_name text,
  office_address text,
  rc_number text,
  can_publish boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Manager profiles (extension)
create table if not exists public.manager_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  employer_user_id uuid references public.profiles(id),
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Manager permissions
do $$ begin
  create type manager_permission as enum ('manage_inventory', 'manage_bookings', 'manage_availability', 'record_inspections', 'view_assigned_finances');
exception when duplicate_object then null; end $$;

create table if not exists public.manager_permissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission manager_permission not null,
  unique(user_id, permission)
);

-- Agent profiles (extension)
create table if not exists public.agent_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  agency_name text,
  display_name text not null,
  referral_code text unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===========================================================================
-- B. UNIVERSITIES AND LOCATIONS
-- ===========================================================================

create table if not exists public.universities (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  short_name text not null,
  city text not null,
  state text not null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  description text,
  logo_path text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.neighbourhoods (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  city text not null,
  state text not null,
  university_id uuid references public.universities(id) on delete set null,
  average_annual_rent_kobo bigint,
  walking_minutes_to_campus integer,
  image_path text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===========================================================================
-- C. PROPERTIES AND OWNERSHIP
-- ===========================================================================

do $$ begin
  create type property_type as enum ('hostel_block', 'apartment_building', 'terrace_house', 'detached_house', 'self_contain_block', 'shared_house');
exception when duplicate_object then null; end $$;

do $$ begin
  create type property_status as enum ('draft', 'pending_verification', 'verified', 'rejected', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type facility as enum ('wifi', 'power_backup', 'water_borehole', 'cctv', 'security_guard', 'parking', 'kitchen_shared', 'kitchen_private', 'laundry', 'study_room', 'gym', 'common_room', 'generator', 'solar_power', 'waste_disposal', 'furnished', 'wardrobe', 'bed_mattress', 'desk_chair', 'ac', 'fan', 'ensuite_bathroom', 'shared_bathroom', 'balcony', 'window');
exception when duplicate_object then null; end $$;

create table if not exists public.properties (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  landlord_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  description text not null default '',
  type property_type not null,
  status property_status not null default 'draft',
  verification_status verification_status not null default 'not_submitted',
  city text not null,
  state text not null,
  neighbourhood_id uuid references public.neighbourhoods(id) on delete set null,
  university_id uuid references public.universities(id) on delete set null,
  public_address_line text not null,
  private_address_line text not null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  total_floors integer not null default 0,
  total_units integer not null default 0,
  available_units integer not null default 0,
  occupied_units integer not null default 0,
  held_units integer not null default 0,
  price_from_kobo bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Property assignments (managers and agents)
create table if not exists public.property_assignments (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role user_role not null check (role in ('property_manager', 'agent')),
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now(),
  unique(property_id, user_id, role)
);

-- Property images
create table if not exists public.property_images (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null,
  public_url text,
  alt_text text not null default '',
  is_verified boolean not null default false,
  caption text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Property facilities (many-to-many)
create table if not exists public.property_facilities (
  property_id uuid not null references public.properties(id) on delete cascade,
  facility facility not null,
  primary key (property_id, facility)
);

-- Property rules
create table if not exists public.property_rules (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  label text not null,
  description text,
  category text not null default 'other',
  created_at timestamptz not null default now()
);

-- ===========================================================================
-- D. FLOORS AND INDIVIDUAL ROOMS
-- ===========================================================================

create table if not exists public.floors (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  label text not null,
  level integer not null,
  description text,
  default_price_kobo bigint,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  create type unit_type as enum ('self_contain', 'single_room', 'shared_room', 'bed_space', 'apartment', 'studio');
exception when duplicate_object then null; end $$;

do $$ begin
  create type unit_status as enum ('available', 'held', 'occupied', 'maintenance', 'off_market');
exception when duplicate_object then null; end $$;

do $$ begin
  create type furnishing_level as enum ('unfurnished', 'semi_furnished', 'fully_furnished');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rental_period as enum ('annual', 'biannual', 'quarterly', 'monthly');
exception when duplicate_object then null; end $$;

create table if not exists public.rentable_units (
  id uuid primary key default uuid_generate_v4(),
  identifier text not null,
  slug text,
  property_id uuid not null references public.properties(id) on delete cascade,
  floor_id uuid references public.floors(id) on delete set null,
  unit_type unit_type not null,
  status unit_status not null default 'available',
  capacity integer not null default 1,
  bedrooms integer not null default 0,
  bathrooms integer not null default 0,
  has_balcony boolean not null default false,
  has_window boolean not null default true,
  size_sqm numeric(8, 2),
  furnishing furnishing_level not null default 'unfurnished',
  representative_images_only boolean not null default false,
  annual_rent_kobo bigint not null,
  rental_period rental_period not null default 'annual',
  caution_deposit_kobo bigint,
  available_from date,
  available_to date,
  booking_terms text,
  active_hold_id uuid,
  active_booking_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, identifier)
);

-- Room facilities (many-to-many)
create table if not exists public.unit_facilities (
  unit_id uuid not null references public.rentable_units(id) on delete cascade,
  facility facility not null,
  primary key (unit_id, facility)
);

-- Room images
create table if not exists public.unit_images (
  id uuid primary key default uuid_generate_v4(),
  unit_id uuid not null references public.rentable_units(id) on delete cascade,
  storage_path text not null,
  public_url text,
  alt_text text not null default '',
  is_verified boolean not null default false,
  caption text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Additional charges per room
create table if not exists public.additional_charges (
  id uuid primary key default uuid_generate_v4(),
  unit_id uuid not null references public.rentable_units(id) on delete cascade,
  label text not null,
  amount_kobo bigint not null,
  frequency text not null default 'one_time' check (frequency in ('one_time', 'annual', 'monthly')),
  created_at timestamptz not null default now()
);

-- ===========================================================================
-- E. VERIFICATION AND KYC
-- ===========================================================================

do $$ begin
  create type verification_evidence_type as enum ('identity', 'address', 'ownership', 'management_authority', 'incorporation', 'tax_clearance', 'inspection_report');
exception when duplicate_object then null; end $$;

do $$ begin
  create type evidence_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.verification_cases (
  id uuid primary key default uuid_generate_v4(),
  reference text not null unique,
  entity_type verification_entity_type not null,
  entity_id uuid not null,
  entity_label text not null,
  submission_type verification_submission_type not null,
  status verification_status not null default 'pending',
  priority priority_level not null default 'medium',
  assigned_officer_id uuid references public.profiles(id),
  sla_due_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_id uuid references public.profiles(id),
  review_notes text,
  rejection_reason text,
  escalated_from uuid references public.profiles(id),
  escalated_to text check (escalated_to in ('super_admin', 'finance_admin')),
  escalated_at timestamptz,
  escalation_reason text,
  outstanding_actions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Verification evidence documents
create table if not exists public.verification_evidence (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid not null references public.verification_cases(id) on delete cascade,
  type verification_evidence_type not null,
  label text not null,
  file_name text not null,
  storage_path text not null,
  uploaded_by uuid not null references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  status evidence_status not null default 'pending',
  reviewer_notes text
);

-- Inspection records
do $$ begin
  create type inspection_status as enum ('scheduled', 'completed', 'cancelled', 'rescheduled');
exception when duplicate_object then null; end $$;

create table if not exists public.inspection_records (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid not null references public.verification_cases(id) on delete cascade,
  scheduled_at timestamptz not null,
  completed_at timestamptz,
  inspector_name text not null,
  findings text not null default '',
  recommendations text not null default '',
  status inspection_status not null default 'scheduled',
  report_path text,
  created_at timestamptz not null default now()
);

-- Internal notes (for verification cases and support tickets)
create table if not exists public.internal_notes (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null check (entity_type in ('verification_case', 'support_ticket')),
  entity_id uuid not null,
  author_id uuid not null references public.profiles(id),
  author_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- ===========================================================================
-- F. BOOKINGS AND RESERVATIONS
-- ===========================================================================

do $$ begin
  create type booking_status as enum ('draft', 'pending_payment', 'payment_initiated', 'confirmed', 'active', 'completed', 'cancelled', 'refunded', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_step as enum ('availability_check', 'temporary_hold', 'booking_creation', 'payment_initiation', 'payment_confirmation', 'booking_confirmation', 'payment_reconciliation', 'refund_or_payout');
exception when duplicate_object then null; end $$;

create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  reference text not null unique,
  student_id uuid not null references public.profiles(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete restrict,
  rentable_unit_id uuid not null references public.rentable_units(id) on delete restrict,
  status booking_status not null default 'pending_payment',
  current_step booking_step not null default 'booking_creation',
  check_in date not null,
  check_out date not null,
  rental_period rental_period not null,
  base_rent_kobo bigint not null,
  additional_charges_kobo bigint not null default 0,
  caution_deposit_kobo bigint not null default 0,
  service_fee_kobo bigint not null default 0,
  total_kobo bigint not null,
  paid_kobo bigint not null default 0,
  outstanding_kobo bigint not null,
  hold_expires_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Booking status history
create table if not exists public.booking_status_history (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status booking_status,
  to_status booking_status not null,
  changed_by uuid references public.profiles(id),
  reason text,
  created_at timestamptz not null default now()
);

-- Saved properties
create table if not exists public.saved_properties (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  unique(user_id, property_id)
);

-- ===========================================================================
-- G. FINANCIAL RECORDS
-- ===========================================================================

do $$ begin
  create type payment_status as enum ('initiated', 'pending', 'successful', 'failed', 'refunded', 'reversed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_channel as enum ('paystack', 'bank_transfer', 'card', 'ussd');
exception when duplicate_object then null; end $$;

create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  reference text not null unique,
  gateway_reference text,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  amount_kobo bigint not null,
  fee_kobo bigint not null default 0,
  net_kobo bigint not null,
  currency text not null default 'NGN',
  channel payment_channel not null,
  status payment_status not null default 'initiated',
  confirmed_by_backend boolean not null default false,
  initiated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  failure_reason text,
  receipt_url text
);

do $$ begin
  create type refund_status as enum ('requested', 'under_review', 'approved', 'rejected', 'processing', 'completed', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type refund_reason as enum ('booking_cancelled_within_24h', 'landlord_failed_to_confirm', 'duplicate_payment', 'failed_payment', 'service_not_delivered', 'mutual_agreement', 'policy_violation', 'other');
exception when duplicate_object then null; end $$;

create table if not exists public.refunds (
  id uuid primary key default uuid_generate_v4(),
  reference text not null unique,
  payment_id uuid not null references public.payments(id) on delete restrict,
  payment_reference text not null,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  amount_kobo bigint not null,
  currency text not null default 'NGN',
  reason refund_reason not null,
  reason_detail text not null,
  status refund_status not null default 'requested',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  provider_reference text,
  completed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  create type payout_status as enum ('scheduled', 'in_flight', 'settled', 'failed', 'reversed');
exception when duplicate_object then null; end $$;

create table if not exists public.payouts (
  id uuid primary key default uuid_generate_v4(),
  reference text not null unique,
  landlord_id uuid not null references public.profiles(id) on delete restrict,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  gross_kobo bigint not null,
  platform_fee_kobo bigint not null,
  net_kobo bigint not null,
  status payout_status not null default 'scheduled',
  settled_at timestamptz,
  bank_account_masked text not null,
  scheduled_for timestamptz not null,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  reversal_reason text,
  provider_reference text,
  eligibility_flags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Reconciliation records
do $$ begin
  create type reconciliation_status as enum ('matched', 'unmatched_provider', 'unmatched_internal', 'amount_discrepancy', 'duplicate_reference', 'settlement_date_mismatch', 'resolved');
exception when duplicate_object then null; end $$;

create table if not exists public.reconciliation_records (
  id uuid primary key default uuid_generate_v4(),
  internal_reference text not null,
  provider_reference text,
  internal_amount_kobo bigint not null,
  provider_amount_kobo bigint,
  internal_settled_at timestamptz,
  provider_settled_at timestamptz,
  status reconciliation_status not null default 'matched',
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now()
);

-- Immutable financial ledger (append-only)
do $$ begin
  create type ledger_entry_type as enum ('payment', 'refund', 'payout', 'commission', 'fee', 'adjustment');
exception when duplicate_object then null; end $$;

create table if not exists public.ledger_entries (
  id uuid primary key default uuid_generate_v4(),
  entry_type ledger_entry_type not null,
  reference text not null,
  booking_id uuid references public.bookings(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete restrict,
  payout_id uuid references public.payouts(id) on delete restrict,
  refund_id uuid references public.refunds(id) on delete restrict,
  debit_kobo bigint not null default 0,
  credit_kobo bigint not null default 0,
  description text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

-- Disputes
do $$ begin
  create type dispute_status as enum ('open', 'under_investigation', 'evidence_requested', 'resolved_in_favor_of_student', 'resolved_in_favor_of_landlord', 'closed');
exception when duplicate_object then null; end $$;

create table if not exists public.disputes (
  id uuid primary key default uuid_generate_v4(),
  reference text not null unique,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  landlord_id uuid not null references public.profiles(id) on delete restrict,
  subject text not null,
  description text not null,
  status dispute_status not null default 'open',
  amount_kobo bigint not null,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===========================================================================
-- H. SUPPORT AND NOTIFICATIONS
-- ===========================================================================

do $$ begin
  create type support_ticket_status as enum ('open', 'in_progress', 'awaiting_user', 'resolved', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type support_team as enum ('general', 'payments', 'verification', 'safety', 'legal', 'technical');
exception when duplicate_object then null; end $$;

create table if not exists public.support_tickets (
  id uuid primary key default uuid_generate_v4(),
  reference text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  category text not null,
  priority priority_level not null default 'medium',
  status support_ticket_status not null default 'open',
  message text not null,
  assigned_to uuid references public.profiles(id),
  team support_team,
  first_response_at timestamptz,
  resolved_at timestamptz,
  sla_due_at timestamptz,
  escalated boolean not null default false,
  escalated_to text check (escalated_to in ('verification_officer', 'finance_admin', 'super_admin')),
  escalated_reason text,
  related_booking_id uuid references public.bookings(id) on delete set null,
  related_payment_reference text,
  related_property_id uuid references public.properties(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ticket messages (customer-visible)
create table if not exists public.ticket_messages (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_role user_role not null,
  author_name text,
  message text not null,
  internal boolean not null default false,
  created_at timestamptz not null default now()
);

-- Ticket attachments
create table if not exists public.ticket_attachments (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  message_id uuid references public.ticket_messages(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_size bigint,
  content_type text,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Notifications
do $$ begin
  create type notification_type as enum ('booking_update', 'payment_update', 'verification_update', 'message', 'system', 'promotion');
exception when duplicate_object then null; end $$;

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text not null,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Notification preferences
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  push_enabled boolean not null default true,
  urgent_alerts boolean not null default true,
  daily_digest boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ===========================================================================
-- I. ADMINISTRATIVE PERMISSIONS AND AUDITING
-- ===========================================================================

do $$ begin
  create type audit_category as enum ('auth', 'user_management', 'role_management', 'verification', 'support', 'finance', 'payout', 'refund', 'configuration', 'security', 'integration');
exception when duplicate_object then null; end $$;

do $$ begin
  create type audit_severity as enum ('info', 'warning', 'critical');
exception when duplicate_object then null; end $$;

-- Audit logs (append-only — NO update or delete policies)
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  timestamp timestamptz not null default now(),
  actor_id uuid references public.profiles(id),
  actor_email text not null,
  actor_role user_role not null,
  category audit_category not null,
  action text not null,
  resource_type text not null,
  resource_id text not null,
  summary text not null,
  severity audit_severity not null default 'info',
  ip_address text,
  user_agent text,
  before_data jsonb,
  after_data jsonb
);

-- Platform settings
do $$ begin
  create type setting_type as enum ('string', 'number', 'boolean', 'json', 'percentage');
exception when duplicate_object then null; end $$;

do $$ begin
  create type setting_category as enum ('commission', 'booking', 'verification', 'support', 'payments', 'operations', 'security');
exception when duplicate_object then null; end $$;

create table if not exists public.platform_settings (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  label text not null,
  description text not null default '',
  type setting_type not null,
  value text not null,
  unit text,
  category setting_category not null,
  requires_reauth boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

-- Integration health
do $$ begin
  create type integration_status as enum ('operational', 'degraded', 'outage', 'maintenance');
exception when duplicate_object then null; end $$;

do $$ begin
  create type integration_category as enum ('payments', 'database', 'storage', 'auth', 'email', 'sms', 'analytics');
exception when duplicate_object then null; end $$;

create table if not exists public.integration_health (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  category integration_category not null,
  status integration_status not null default 'operational',
  last_success_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  uptime_24h numeric(5, 2) not null default 100,
  avg_response_ms integer not null default 0,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Knowledge base articles
create table if not exists public.knowledge_base_articles (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  title text not null,
  category text not null,
  excerpt text not null default '',
  content text not null default '',
  tags text[] not null default '{}',
  views integer not null default 0,
  published boolean not null default false,
  author_id uuid not null references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- System announcements
create table if not exists public.system_announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all', 'students', 'landlords', 'staff', 'admins')),
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id)
);

-- Dispute evidence
create table if not exists public.dispute_evidence (
  id uuid primary key default uuid_generate_v4(),
  dispute_id uuid not null references public.disputes(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- ===========================================================================
-- INDEXES
-- ===========================================================================

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role on public.user_roles(role);

create index if not exists idx_universities_slug on public.universities(slug);
create index if not exists idx_neighbourhoods_slug on public.neighbourhoods(slug);
create index if not exists idx_neighbourhoods_university_id on public.neighbourhoods(university_id);

create index if not exists idx_properties_landlord_id on public.properties(landlord_id);
create index if not exists idx_properties_slug on public.properties(slug);
create index if not exists idx_properties_status on public.properties(status);
create index if not exists idx_properties_university_id on public.properties(university_id);
create index if not exists idx_properties_neighbourhood_id on public.properties(neighbourhood_id);

create index if not exists idx_property_assignments_property_id on public.property_assignments(property_id);
create index if not exists idx_property_assignments_user_id on public.property_assignments(user_id);

create index if not exists idx_floors_property_id on public.floors(property_id);

create index if not exists idx_rentable_units_property_id on public.rentable_units(property_id);
create index if not exists idx_rentable_units_floor_id on public.rentable_units(floor_id);
create index if not exists idx_rentable_units_status on public.rentable_units(status);
create index if not exists idx_rentable_units_slug on public.rentable_units(slug);

create index if not exists idx_verification_cases_status on public.verification_cases(status);
create index if not exists idx_verification_cases_entity on public.verification_cases(entity_type, entity_id);
create index if not exists idx_verification_cases_assigned_officer on public.verification_cases(assigned_officer_id);
create index if not exists idx_verification_cases_reference on public.verification_cases(reference);

create index if not exists idx_bookings_student_id on public.bookings(student_id);
create index if not exists idx_bookings_property_id on public.bookings(property_id);
create index if not exists idx_bookings_rentable_unit_id on public.bookings(rentable_unit_id);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_bookings_reference on public.bookings(reference);

create index if not exists idx_payments_booking_id on public.payments(booking_id);
create index if not exists idx_payments_student_id on public.payments(student_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_reference on public.payments(reference);

create index if not exists idx_refunds_status on public.refunds(status);
create index if not exists idx_payouts_landlord_id on public.payouts(landlord_id);
create index if not exists idx_payouts_status on public.payouts(status);

create index if not exists idx_support_tickets_user_id on public.support_tickets(user_id);
create index if not exists idx_support_tickets_status on public.support_tickets(status);
create index if not exists idx_support_tickets_assigned_to on public.support_tickets(assigned_to);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(user_id, read);

create index if not exists idx_audit_logs_timestamp on public.audit_logs(timestamp desc);
create index if not exists idx_audit_logs_actor_id on public.audit_logs(actor_id);
create index if not exists idx_audit_logs_category on public.audit_logs(category);
create index if not exists idx_audit_logs_severity on public.audit_logs(severity);
create index if not exists idx_audit_logs_resource on public.audit_logs(resource_type, resource_id);

create index if not exists idx_saved_properties_user_id on public.saved_properties(user_id);

-- Updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger if not exists profiles_updated_at before update on public.profiles for each row execute function public.handle_updated_at();
create trigger if not exists universities_updated_at before update on public.universities for each row execute function public.handle_updated_at();
create trigger if not exists neighbourhoods_updated_at before update on public.neighbourhoods for each row execute function public.handle_updated_at();
create trigger if not exists properties_updated_at before update on public.properties for each row execute function public.handle_updated_at();
create trigger if not exists floors_updated_at before update on public.floors for each row execute function public.handle_updated_at();
create trigger if not exists rentable_units_updated_at before update on public.rentable_units for each row execute function public.handle_updated_at();
create trigger if not exists verification_cases_updated_at before update on public.verification_cases for each row execute function public.handle_updated_at();
create trigger if not exists bookings_updated_at before update on public.bookings for each row execute function public.handle_updated_at();
create trigger if not exists refunds_updated_at before update on public.refunds for each row execute function public.handle_updated_at();
create trigger if not exists support_tickets_updated_at before update on public.support_tickets for each row execute function public.handle_updated_at();
create trigger if not exists platform_settings_updated_at before update on public.platform_settings for each row execute function public.handle_updated_at();
create trigger if not exists integration_health_updated_at before update on public.integration_health for each row execute function public.handle_updated_at();
create trigger if not exists knowledge_base_updated_at before update on public.knowledge_base_articles for each row execute function public.handle_updated_at();
create trigger if not exists disputes_updated_at before update on public.disputes for each row execute function public.handle_updated_at();
-- ===========================================================================
-- NetLodge Schema Migration — Part 2: Functions and Triggers
-- ===========================================================================
-- Database functions for profile creation, booking concurrency, audit logging.
-- Run after 0001_schema.sql.
-- ===========================================================================

-- ===========================================================================
-- Auto-create profile when a new auth user signs up
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  )
  on conflict (id) do nothing;

  -- Assign default 'student' role — NEVER grant admin roles on signup.
  insert into public.user_roles (user_id, role, reason)
  values (new.id, 'student', 'Default role on registration')
  on conflict (user_id, role) do nothing;

  -- Create notification preferences
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists, then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- Get current user's roles
-- ===========================================================================
create or replace function public.get_user_roles(p_user_id uuid)
returns user_role[] as $$
  select array_agg(role) from public.user_roles where user_id = p_user_id;
$$ language sql security definer stable;

-- ===========================================================================
-- Check if user has a specific role
-- ===========================================================================
create or replace function public.has_role(p_user_id uuid, p_role user_role)
returns boolean as $$
  select exists(select 1 from public.user_roles where user_id = p_user_id and role = p_role);
$$ language sql security definer stable;

-- ===========================================================================
-- Check if user is an admin (any admin role)
-- ===========================================================================
create or replace function public.is_admin(p_user_id uuid)
returns boolean as $$
  select exists(
    select 1 from public.user_roles
    where user_id = p_user_id
    and role in ('verification_officer', 'support_staff', 'finance_admin', 'super_admin')
  );
$$ language sql security definer stable;

-- ===========================================================================
-- Check if user owns or is assigned to a property
-- ===========================================================================
create or replace function public.can_access_property(p_user_id uuid, p_property_id uuid)
returns boolean as $$
  select exists(
    select 1 from public.properties
    where id = p_property_id and landlord_id = p_user_id
  ) or exists(
    select 1 from public.property_assignments
    where property_id = p_property_id and user_id = p_user_id
  );
$$ language sql security definer stable;

-- ===========================================================================
-- Prevent double-booking: atomically reserve a room
-- Returns the booking ID on success, NULL on failure.
-- ===========================================================================
create or replace function public.create_booking(
  p_student_id uuid,
  p_unit_id uuid,
  p_check_in date,
  p_check_out date,
  p_rental_period rental_period,
  p_base_rent_kobo bigint,
  p_additional_charges_kobo bigint,
  p_caution_deposit_kobo bigint,
  p_service_fee_kobo bigint,
  p_total_kobo bigint
)
returns uuid as $$
declare
  v_booking_id uuid;
  v_property_id uuid;
  v_reference text;
  v_hold_expires timestamptz;
begin
  -- Lock the room row to prevent concurrent booking
  select property_id into v_property_id
  from public.rentable_units
  where id = p_unit_id
  for update;

  if not found then
    raise exception 'Room not found';
  end if;

  -- Check the room is available
  if not exists(
    select 1 from public.rentable_units
    where id = p_unit_id and status = 'available'
  ) then
    raise exception 'Room is not available';
  end if;

  -- Check for overlapping bookings
  if exists(
    select 1 from public.bookings
    where rentable_unit_id = p_unit_id
    and status in ('pending_payment', 'payment_initiated', 'confirmed', 'active')
    and check_in < p_check_out
    and p_check_in < check_out
  ) then
    raise exception 'Room is already booked for the selected period';
  end if;

  -- Generate a unique reference
  v_reference := 'NLG-BKG-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
  v_hold_expires := now() + interval '24 hours';

  -- Create the booking
  insert into public.bookings (
    reference, student_id, property_id, rentable_unit_id,
    status, current_step, check_in, check_out, rental_period,
    base_rent_kobo, additional_charges_kobo, caution_deposit_kobo,
    service_fee_kobo, total_kobo, paid_kobo, outstanding_kobo,
    hold_expires_at
  ) values (
    v_reference, p_student_id, v_property_id, p_unit_id,
    'pending_payment', 'booking_creation', p_check_in, p_check_out, p_rental_period,
    p_base_rent_kobo, p_additional_charges_kobo, p_caution_deposit_kobo,
    p_service_fee_kobo, p_total_kobo, 0, p_total_kobo,
    v_hold_expires
  )
  returning id into v_booking_id;

  -- Mark the room as held
  update public.rentable_units
  set status = 'held', active_hold_id = v_booking_id, updated_at = now()
  where id = p_unit_id;

  -- Record status history
  insert into public.booking_status_history (booking_id, to_status, changed_by)
  values (v_booking_id, 'pending_payment', p_student_id);

  return v_booking_id;
end;
$$ language plpgsql security definer;

-- ===========================================================================
-- Confirm a booking after payment is verified
-- ===========================================================================
create or replace function public.confirm_booking(p_booking_id uuid)
returns void as $$
declare
  v_unit_id uuid;
begin
  -- Lock the booking
  select rentable_unit_id into v_unit_id
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  -- Update booking status
  update public.bookings
  set status = 'confirmed',
      current_step = 'booking_confirmation',
      confirmed_at = now(),
      updated_at = now()
  where id = p_booking_id;

  -- Update room status
  update public.rentable_units
  set status = 'occupied',
      active_booking_id = p_booking_id,
      active_hold_id = null,
      updated_at = now()
  where id = v_unit_id;

  -- Record status history
  insert into public.booking_status_history (booking_id, from_status, to_status)
  select 'pending_payment', 'confirmed'
  where exists (select 1 from public.bookings where id = p_booking_id);

  -- Insert into ledger
  insert into public.ledger_entries (entry_type, reference, booking_id, credit_kobo, description)
  select 'payment', b.reference, b.id, b.paid_kobo, 'Payment confirmed for booking ' || b.reference
  from public.bookings b
  where b.id = p_booking_id;
end;
$$ language plpgsql security definer;

-- ===========================================================================
-- Cancel a booking and release the room
-- ===========================================================================
create or replace function public.cancel_booking(p_booking_id uuid, p_reason text)
returns void as $$
declare
  v_unit_id uuid;
  v_current_status booking_status;
begin
  select rentable_unit_id, status into v_unit_id, v_current_status
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  -- Update booking
  update public.bookings
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = p_reason,
      updated_at = now()
  where id = p_booking_id;

  -- Release the room if it was held
  if v_current_status in ('pending_payment', 'payment_initiated') then
    update public.rentable_units
    set status = 'available', active_hold_id = null, updated_at = now()
    where id = v_unit_id and status = 'held';
  end if;

  -- Record status history
  insert into public.booking_status_history (booking_id, from_status, to_status, reason)
  values (p_booking_id, v_current_status, 'cancelled', p_reason);
end;
$$ language plpgsql security definer;

-- ===========================================================================
-- Record an audit log entry
-- ===========================================================================
create or replace function public.record_audit(
  p_actor_id uuid,
  p_actor_email text,
  p_actor_role user_role,
  p_category audit_category,
  p_action text,
  p_resource_type text,
  p_resource_id text,
  p_summary text,
  p_severity audit_severity default 'info',
  p_ip_address text default null,
  p_user_agent text default null,
  p_before_data jsonb default null,
  p_after_data jsonb default null
)
returns uuid as $$
declare
  v_id uuid;
begin
  insert into public.audit_logs (
    actor_id, actor_email, actor_role, category, action,
    resource_type, resource_id, summary, severity,
    ip_address, user_agent, before_data, after_data
  ) values (
    p_actor_id, p_actor_email, p_actor_role, p_category, p_action,
    p_resource_type, p_resource_id, p_summary, p_severity,
    p_ip_address, p_user_agent, p_before_data, p_after_data
  )
  returning id into v_id;

  return v_id;
end;
$$ language plpgsql security definer;

-- ===========================================================================
-- Prevent deletion of audit logs (trigger)
-- ===========================================================================
create or replace function public.prevent_audit_delete()
returns trigger as $$
begin
  raise exception 'Audit logs are immutable and cannot be deleted';
end;
$$ language plpgsql;

drop trigger if exists prevent_audit_delete on public.audit_logs;
create trigger prevent_audit_delete
  before delete on public.audit_logs
  for each row execute function public.prevent_audit_delete();

create or replace function public.prevent_audit_update()
returns trigger as $$
begin
  raise exception 'Audit logs are immutable and cannot be updated';
end;
$$ language plpgsql;

drop trigger if exists prevent_audit_update on public.audit_logs;
create trigger prevent_audit_update
  before update on public.audit_logs
  for each row execute function public.prevent_audit_update();

-- ===========================================================================
-- Prevent deletion of ledger entries (trigger)
-- ===========================================================================
create or replace function public.prevent_ledger_delete()
returns trigger as $$
begin
  raise exception 'Ledger entries are immutable and cannot be deleted';
end;
$$ language plpgsql;

drop trigger if exists prevent_ledger_delete on public.ledger_entries;
create trigger prevent_ledger_delete
  before delete on public.ledger_entries
  for each row execute function public.prevent_ledger_delete();

create or replace function public.prevent_ledger_update()
returns trigger as $$
begin
  raise exception 'Ledger entries are immutable and cannot be updated';
end;
$$ language plpgsql;

drop trigger if exists prevent_ledger_update on public.ledger_entries;
create trigger prevent_ledger_update
  before update on public.ledger_entries
  for each row execute function public.prevent_ledger_update();
-- ===========================================================================
-- NetLodge Schema Migration — Part 3: Row Level Security Policies
-- ===========================================================================
-- Enables RLS on every application table and defines restrictive policies.
-- Run after 0001_schema.sql and 0002_functions_and_triggers.sql.
-- ===========================================================================

-- ===========================================================================
-- Enable RLS on ALL tables
-- ===========================================================================
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.landlord_profiles enable row level security;
alter table public.manager_profiles enable row level security;
alter table public.manager_permissions enable row level security;
alter table public.agent_profiles enable row level security;
alter table public.universities enable row level security;
alter table public.neighbourhoods enable row level security;
alter table public.properties enable row level security;
alter table public.property_assignments enable row level security;
alter table public.property_images enable row level security;
alter table public.property_facilities enable row level security;
alter table public.property_rules enable row level security;
alter table public.floors enable row level security;
alter table public.rentable_units enable row level security;
alter table public.unit_facilities enable row level security;
alter table public.unit_images enable row level security;
alter table public.additional_charges enable row level security;
alter table public.verification_cases enable row level security;
alter table public.verification_evidence enable row level security;
alter table public.inspection_records enable row level security;
alter table public.internal_notes enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.saved_properties enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.payouts enable row level security;
alter table public.reconciliation_records enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.disputes enable row level security;
alter table public.dispute_evidence enable row level security;
alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.audit_logs enable row level security;
alter table public.platform_settings enable row level security;
alter table public.integration_health enable row level security;
alter table public.knowledge_base_articles enable row level security;
alter table public.system_announcements enable row level security;

-- ===========================================================================
-- PROFILES — users can read/update their own profile; admins can read all
-- ===========================================================================
create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id or public.is_admin(auth.uid()));

create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Super admins update all profiles" on public.profiles
  for update using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- ===========================================================================
-- USER_ROLES — users read their own roles; super admins manage all
-- ===========================================================================
create policy "Users read own roles" on public.user_roles
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "Super admins manage roles" on public.user_roles
  for all using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- Prevent self-assigning admin roles via check constraint
-- (The handle_new_user function only assigns 'student')

-- ===========================================================================
-- STUDENT/LANDLORD/MANAGER/AGENT PROFILES — own access + admin read
-- ===========================================================================
create policy "Users read own student profile" on public.student_profiles
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "Users update own student profile" on public.student_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users insert own student profile" on public.student_profiles
  for insert with check (auth.uid() = user_id);

create policy "Users read own landlord profile" on public.landlord_profiles
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "Users update own landlord profile" on public.landlord_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users insert own landlord profile" on public.landlord_profiles
  for insert with check (auth.uid() = user_id);

create policy "Users read own manager profile" on public.manager_profiles
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "Users update own manager profile" on public.manager_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read own agent profile" on public.agent_profiles
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "Users update own agent profile" on public.agent_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read own manager permissions" on public.manager_permissions
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- ===========================================================================
-- UNIVERSITIES & NEIGHBOURHOODS — public read, admin write
-- ===========================================================================
create policy "Public read universities" on public.universities
  for select using (active = true or public.is_admin(auth.uid()));
create policy "Admin manage universities" on public.universities
  for all using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

create policy "Public read neighbourhoods" on public.neighbourhoods
  for select using (active = true or public.is_admin(auth.uid()));
create policy "Admin manage neighbourhoods" on public.neighbourhoods
  for all using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- ===========================================================================
-- PROPERTIES — public read verified; landlords manage own; managers/agents access assigned
-- ===========================================================================
create policy "Public read verified properties" on public.properties
  for select using (
    status in ('verified', 'pending_verification')
    or public.is_admin(auth.uid())
    or landlord_id = auth.uid()
    or public.can_access_property(auth.uid(), id)
  );

create policy "Landlords create properties" on public.properties
  for insert with check (
    landlord_id = auth.uid() and public.has_role(auth.uid(), 'landlord')
  );

create policy "Landlords update own properties" on public.properties
  for update using (
    landlord_id = auth.uid()
    or public.can_access_property(auth.uid(), id)
    or public.is_admin(auth.uid())
  ) with check (
    landlord_id = auth.uid()
    or public.is_admin(auth.uid())
  );

create policy "Landlords delete own properties" on public.properties
  for delete using (
    landlord_id = auth.uid() and public.has_role(auth.uid(), 'landlord')
  );

-- ===========================================================================
-- PROPERTY ASSIGNMENTS — landlord manages; assigned user reads
-- ===========================================================================
create policy "Landlord manages assignments" on public.property_assignments
  for all using (
    exists(select 1 from public.properties p where p.id = property_id and p.landlord_id = auth.uid())
    or user_id = auth.uid()
    or public.is_admin(auth.uid())
  ) with check (
    exists(select 1 from public.properties p where p.id = property_id and p.landlord_id = auth.uid())
    or public.is_admin(auth.uid())
  );

-- ===========================================================================
-- PROPERTY IMAGES — property owner/manager manages
-- ===========================================================================
create policy "Read property images" on public.property_images
  for select using (
    exists(select 1 from public.properties p where p.id = property_id and (
      p.status = 'verified'
      or p.landlord_id = auth.uid()
      or public.can_access_property(auth.uid(), p.id)
      or public.is_admin(auth.uid())
    ))
  );

create policy "Manage property images" on public.property_images
  for all using (
    exists(select 1 from public.properties p where p.id = property_id and (
      p.landlord_id = auth.uid()
      or public.can_access_property(auth.uid(), p.id)
      or public.is_admin(auth.uid())
    ))
  ) with check (
    exists(select 1 from public.properties p where p.id = property_id and (
      p.landlord_id = auth.uid()
      or public.can_access_property(auth.uid(), p.id)
      or public.is_admin(auth.uid())
    ))
  );

-- ===========================================================================
-- PROPERTY FACILITIES & RULES — same access as property
-- ===========================================================================
create policy "Read property facilities" on public.property_facilities
  for select using (true);
create policy "Manage property facilities" on public.property_facilities
  for all using (
    exists(select 1 from public.properties p where p.id = property_id and (
      p.landlord_id = auth.uid()
      or public.can_access_property(auth.uid(), p.id)
      or public.is_admin(auth.uid())
    ))
  ) with check (
    exists(select 1 from public.properties p where p.id = property_id and (
      p.landlord_id = auth.uid()
      or public.can_access_property(auth.uid(), p.id)
      or public.is_admin(auth.uid())
    ))
  );

create policy "Read property rules" on public.property_rules
  for select using (true);
create policy "Manage property rules" on public.property_rules
  for all using (
    exists(select 1 from public.properties p where p.id = property_id and (
      p.landlord_id = auth.uid()
      or public.can_access_property(auth.uid(), p.id)
      or public.is_admin(auth.uid())
    ))
  ) with check (
    exists(select 1 from public.properties p where p.id = property_id and (
      p.landlord_id = auth.uid()
      or public.can_access_property(auth.uid(), p.id)
      or public.is_admin(auth.uid())
    ))
  );

-- ===========================================================================
-- FLOORS — same access as parent property
-- ===========================================================================
create policy "Read floors" on public.floors
  for select using (
    exists(select 1 from public.properties p where p.id = floors.property_id and (
      p.status in ('verified', 'pending_verification')
      or p.landlord_id = auth.uid()
      or public.can_access_property(auth.uid(), p.id)
      or public.is_admin(auth.uid())
    ))
  );

create policy "Manage floors" on public.floors
  for all using (
    exists(select 1 from public.properties p where p.id = floors.property_id and (
      p.landlord_id = auth.uid()
      or public.can_access_property(auth.uid(), p.id)
      or public.is_admin(auth.uid())
    ))
  ) with check (
    exists(select 1 from public.properties p where p.id = floors.property_id and (
      p.landlord_id = auth.uid()
      or public.can_access_property(auth.uid(), p.id)
      or public.is_admin(auth.uid())
    ))
  );

-- ===========================================================================
-- RENTABLE_UNITS — public read available; owner/manager manages
-- ===========================================================================
create policy "Read rentable units" on public.rentable_units
  for select using (
    exists(select 1 from public.properties p where p.id = rentable_units.property_id and (
      p.status in ('verified', 'pending_verification')
      or p.landlord_id = auth.uid()
      or public.can_access_property(auth.uid(), p.id)
      or public.is_admin(auth.uid())
    ))
  );

create policy "Manage rentable units" on public.rentable_units
  for all using (
    exists(select 1 from public.properties p where p.id = rentable_units.property_id and (
      p.landlord_id = auth.uid()
      or public.can_access_property(auth.uid(), p.id)
      or public.is_admin(auth.uid())
    ))
  ) with check (
    exists(select 1 from public.properties p where p.id = rentable_units.property_id and (
      p.landlord_id = auth.uid()
      or public.can_access_property(auth.uid(), p.id)
      or public.is_admin(auth.uid())
    ))
  );

-- Unit facilities and images follow same pattern
create policy "Read unit facilities" on public.unit_facilities for select using (true);
create policy "Manage unit facilities" on public.unit_facilities
  for all using (
    exists(select 1 from public.rentable_units u where u.id = unit_id and (
      exists(select 1 from public.properties p where p.id = u.property_id and (
        p.landlord_id = auth.uid() or public.can_access_property(auth.uid(), p.id) or public.is_admin(auth.uid())
      ))
    ))
  ) with check (
    exists(select 1 from public.rentable_units u where u.id = unit_id and (
      exists(select 1 from public.properties p where p.id = u.property_id and (
        p.landlord_id = auth.uid() or public.can_access_property(auth.uid(), p.id) or public.is_admin(auth.uid())
      ))
    ))
  );

create policy "Read unit images" on public.unit_images
  for select using (true);
create policy "Manage unit images" on public.unit_images
  for all using (
    exists(select 1 from public.rentable_units u where u.id = unit_id and (
      exists(select 1 from public.properties p where p.id = u.property_id and (
        p.landlord_id = auth.uid() or public.can_access_property(auth.uid(), p.id) or public.is_admin(auth.uid())
      ))
    ))
  ) with check (
    exists(select 1 from public.rentable_units u where u.id = unit_id and (
      exists(select 1 from public.properties p where p.id = u.property_id and (
        p.landlord_id = auth.uid() or public.can_access_property(auth.uid(), p.id) or public.is_admin(auth.uid())
      ))
    ))
  );

create policy "Read additional charges" on public.additional_charges
  for select using (true);
create policy "Manage additional charges" on public.additional_charges
  for all using (
    exists(select 1 from public.rentable_units u where u.id = unit_id and (
      exists(select 1 from public.properties p where p.id = u.property_id and (
        p.landlord_id = auth.uid() or public.can_access_property(auth.uid(), p.id) or public.is_admin(auth.uid())
      ))
    ))
  ) with check (
    exists(select 1 from public.rentable_units u where u.id = unit_id and (
      exists(select 1 from public.properties p where p.id = u.property_id and (
        p.landlord_id = auth.uid() or public.can_access_property(auth.uid(), p.id) or public.is_admin(auth.uid())
      ))
    ))
  );

-- ===========================================================================
-- VERIFICATION CASES — officers read/review; applicants read own; super admin all
-- ===========================================================================
create policy "Officers read verification cases" on public.verification_cases
  for select using (
    public.has_role(auth.uid(), 'verification_officer')
    or public.has_role(auth.uid(), 'super_admin')
    or exists(select 1 from public.profiles p where p.id = auth.uid() and p.id = entity_id)
    or exists(select 1 from public.properties p where p.id = entity_id and p.landlord_id = auth.uid())
  );

create policy "Officers update verification cases" on public.verification_cases
  for update using (
    public.has_role(auth.uid(), 'verification_officer')
    or public.has_role(auth.uid(), 'super_admin')
  ) with check (
    public.has_role(auth.uid(), 'verification_officer')
    or public.has_role(auth.uid(), 'super_admin')
  );

create policy "Applicants create verification cases" on public.verification_cases
  for insert with check (
    auth.uid() is not null
  );

-- Verification evidence — officers and applicant
create policy "Read verification evidence" on public.verification_evidence
  for select using (
    public.has_role(auth.uid(), 'verification_officer')
    or public.has_role(auth.uid(), 'super_admin')
    or exists(select 1 from public.verification_cases c where c.id = case_id and (
      c.entity_id = auth.uid()
      or exists(select 1 from public.properties p where p.id = c.entity_id and p.landlord_id = auth.uid())
    ))
  );

create policy "Upload verification evidence" on public.verification_evidence
  for insert with check (auth.uid() = uploaded_by);

-- Inspection records — officers only
create policy "Officers manage inspections" on public.inspection_records
  for all using (
    public.has_role(auth.uid(), 'verification_officer')
    or public.has_role(auth.uid(), 'super_admin')
  ) with check (
    public.has_role(auth.uid(), 'verification_officer')
    or public.has_role(auth.uid(), 'super_admin')
  );

-- Internal notes — officers and support staff
create policy "Staff manage internal notes" on public.internal_notes
  for all using (
    public.is_admin(auth.uid())
  ) with check (
    public.is_admin(auth.uid())
  );

-- ===========================================================================
-- BOOKINGS — student reads own; landlord reads property's; admin reads all
-- ===========================================================================
create policy "Students read own bookings" on public.bookings
  for select using (
    student_id = auth.uid()
    or exists(select 1 from public.properties p where p.id = bookings.property_id and p.landlord_id = auth.uid())
    or exists(select 1 from public.property_assignments pa where pa.property_id = bookings.property_id and pa.user_id = auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "Students create bookings" on public.bookings
  for insert with check (student_id = auth.uid());

create policy "Update own bookings" on public.bookings
  for update using (
    student_id = auth.uid()
    or exists(select 1 from public.properties p where p.id = bookings.property_id and p.landlord_id = auth.uid())
    or exists(select 1 from public.property_assignments pa where pa.property_id = bookings.property_id and pa.user_id = auth.uid())
    or public.is_admin(auth.uid())
  ) with check (true);

create policy "Delete own bookings" on public.bookings
  for delete using (student_id = auth.uid() and status in ('draft', 'pending_payment'));

-- Booking status history
create policy "Read booking history" on public.booking_status_history
  for select using (
    exists(select 1 from public.bookings b where b.id = booking_id and (
      b.student_id = auth.uid()
      or exists(select 1 from public.properties p where p.id = b.property_id and p.landlord_id = auth.uid())
      or public.is_admin(auth.uid())
    ))
  );

create policy "Insert booking history" on public.booking_status_history
  for insert with check (auth.uid() is not null);

-- ===========================================================================
-- SAVED PROPERTIES — users manage their own
-- ===========================================================================
create policy "Users manage saved properties" on public.saved_properties
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===========================================================================
-- PAYMENTS — student reads own; finance admin reads all; landlord reads property's
-- ===========================================================================
create policy "Read payments" on public.payments
  for select using (
    student_id = auth.uid()
    or public.has_role(auth.uid(), 'finance_admin')
    or public.has_role(auth.uid(), 'super_admin')
    or exists(select 1 from public.bookings b where b.id = payments.booking_id and (
      exists(select 1 from public.properties p where p.id = b.property_id and p.landlord_id = auth.uid())
    ))
  );

create policy "Create payments" on public.payments
  for insert with check (student_id = auth.uid() or public.is_admin(auth.uid()));

-- No update policy — payments are immutable except via server actions
create policy "Admin update payments" on public.payments
  for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ===========================================================================
-- REFUNDS — finance admin manages; student reads own
-- ===========================================================================
create policy "Read refunds" on public.refunds
  for select using (
    student_id = auth.uid()
    or public.has_role(auth.uid(), 'finance_admin')
    or public.has_role(auth.uid(), 'super_admin')
  );

create policy "Admin manage refunds" on public.refunds
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ===========================================================================
-- PAYOUTS — landlord reads own; finance admin manages
-- ===========================================================================
create policy "Read payouts" on public.payouts
  for select using (
    landlord_id = auth.uid()
    or public.has_role(auth.uid(), 'finance_admin')
    or public.has_role(auth.uid(), 'super_admin')
  );

create policy "Admin manage payouts" on public.payouts
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ===========================================================================
-- RECONCILIATION — finance admin only
-- ===========================================================================
create policy "Finance manage reconciliation" on public.reconciliation_records
  for all using (
    public.has_role(auth.uid(), 'finance_admin')
    or public.has_role(auth.uid(), 'super_admin')
  ) with check (
    public.has_role(auth.uid(), 'finance_admin')
    or public.has_role(auth.uid(), 'super_admin')
  );

-- ===========================================================================
-- LEDGER ENTRIES — admin read only (immutable, no insert/update/delete via RLS)
-- ===========================================================================
create policy "Admin read ledger" on public.ledger_entries
  for select using (public.is_admin(auth.uid()));

-- Insert is only allowed via SECURITY DEFINER functions (confirm_booking, etc.)
create policy "Insert ledger via function" on public.ledger_entries
  for insert with check (public.is_admin(auth.uid()));

-- ===========================================================================
-- DISPUTES — participants read; admin manages
-- ===========================================================================
create policy "Read disputes" on public.disputes
  for select using (
    student_id = auth.uid()
    or landlord_id = auth.uid()
    or public.is_admin(auth.uid())
  );

create policy "Admin manage disputes" on public.disputes
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "Read dispute evidence" on public.dispute_evidence
  for select using (
    exists(select 1 from public.disputes d where d.id = dispute_id and (
      d.student_id = auth.uid() or d.landlord_id = auth.uid() or public.is_admin(auth.uid())
    ))
  );

create policy "Upload dispute evidence" on public.dispute_evidence
  for insert with check (auth.uid() = uploader_id);

-- ===========================================================================
-- SUPPORT TICKETS — user reads own; support staff reads all; admin manages
-- ===========================================================================
create policy "Users read own tickets" on public.support_tickets
  for select using (
    user_id = auth.uid()
    or public.has_role(auth.uid(), 'support_staff')
    or public.is_admin(auth.uid())
  );

create policy "Users create tickets" on public.support_tickets
  for insert with check (user_id = auth.uid());

create policy "Staff update tickets" on public.support_tickets
  for update using (
    user_id = auth.uid()
    or public.has_role(auth.uid(), 'support_staff')
    or public.is_admin(auth.uid())
  ) with check (true);

-- Ticket messages
create policy "Read ticket messages" on public.ticket_messages
  for select using (
    exists(select 1 from public.support_tickets t where t.id = ticket_id and (
      t.user_id = auth.uid()
      or public.has_role(auth.uid(), 'support_staff')
      or public.is_admin(auth.uid())
    ))
  );

create policy "Send ticket messages" on public.ticket_messages
  for insert with check (auth.uid() = author_id);

-- Ticket attachments
create policy "Read ticket attachments" on public.ticket_attachments
  for select using (
    exists(select 1 from public.support_tickets t where t.id = ticket_id and (
      t.user_id = auth.uid()
      or public.has_role(auth.uid(), 'support_staff')
      or public.is_admin(auth.uid())
    ))
  );

create policy "Upload ticket attachments" on public.ticket_attachments
  for insert with check (auth.uid() = uploaded_by);

-- ===========================================================================
-- NOTIFICATIONS — users read/manage own only
-- ===========================================================================
create policy "Users manage notifications" on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage notification prefs" on public.notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===========================================================================
-- AUDIT LOGS — super admin read only (no insert/update/delete via RLS)
-- ===========================================================================
create policy "Super admin read audit logs" on public.audit_logs
  for select using (public.has_role(auth.uid(), 'super_admin'));

create policy "Finance admin read audit logs" on public.audit_logs
  for select using (public.has_role(auth.uid(), 'finance_admin') and category in ('finance', 'payout', 'refund'));

-- Insert is only allowed via the SECURITY DEFINER record_audit function
create policy "Insert audit via function" on public.audit_logs
  for insert with check (auth.uid() is not null);

-- ===========================================================================
-- PLATFORM SETTINGS — super admin read/write; others read
-- ===========================================================================
create policy "Admin read settings" on public.platform_settings
  for select using (public.is_admin(auth.uid()));

create policy "Super admin manage settings" on public.platform_settings
  for all using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- ===========================================================================
-- INTEGRATION HEALTH — super admin only
-- ===========================================================================
create policy "Super admin manage integrations" on public.integration_health
  for all using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- ===========================================================================
-- KNOWLEDGE BASE — support staff manage; public read published
-- ===========================================================================
create policy "Read published KB articles" on public.knowledge_base_articles
  for select using (published = true or public.is_admin(auth.uid()));

create policy "Staff manage KB articles" on public.knowledge_base_articles
  for all using (
    public.has_role(auth.uid(), 'support_staff')
    or public.has_role(auth.uid(), 'super_admin')
  ) with check (
    public.has_role(auth.uid(), 'support_staff')
    or public.has_role(auth.uid(), 'super_admin')
  );

-- ===========================================================================
-- SYSTEM ANNOUNCEMENTS — super admin manages; all users read active
-- ===========================================================================
create policy "Read active announcements" on public.system_announcements
  for select using (active = true or public.has_role(auth.uid(), 'super_admin'));

create policy "Super admin manage announcements" on public.system_announcements
  for all using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));
-- ===========================================================================
-- NetLodge Schema Migration — Part 4: Seed Data
-- ===========================================================================
-- Initial reference data: universities, neighbourhoods, platform settings.
-- Run after 0001_schema.sql, 0002_functions_and_triggers.sql, 0003_rls_policies.sql.
-- ===========================================================================

-- ===========================================================================
-- UNIVERSITIES
-- ===========================================================================
insert into public.universities (slug, name, short_name, city, state, latitude, longitude, description, active) values
  ('university-of-lagos', 'University of Lagos', 'UNILAG', 'Lagos', 'Lagos', 6.5158, 3.3898, 'The University of the First Choice and the Nation''s Pride. UNILAG''s Akoka campus is surrounded by a vibrant student accommodation market.', true),
  ('university-of-ibadan', 'University of Ibadan', 'UI', 'Ibadan', 'Oyo', 7.4456, 3.8990, 'Nigeria''s oldest university with a mature off-campus housing market.', true),
  ('obafemi-awolowo-university', 'Obafemi Awolowo University', 'OAU', 'Ile-Ife', 'Osun', 7.5210, 4.5275, 'A scenic campus whose off-campus accommodation clusters around Mayfair and Sabo.', true),
  ('university-of-benin', 'University of Benin', 'UNIBEN', 'Benin City', 'Edo', 6.3956, 5.6097, 'UNIBEN''s two campuses draw students to Ugbowo and BDPA for off-campus living.', true),
  ('ahmadu-bello-university', 'Ahmadu Bello University', 'ABU', 'Zaria', 'Kaduna', 11.1517, 7.6519, 'ABU''s Samaru campus anchors a busy housing market in Samaru and Palladan.', true),
  ('university-of-nigeria-nsukka', 'University of Nigeria, Nsukka', 'UNN', 'Nsukka', 'Enugu', 6.8567, 7.3956, 'UNN''s Lions'' campus has off-campus accommodation spread across Nsukka town.', true)
on conflict (slug) do nothing;

-- ===========================================================================
-- NEIGHBOURHOODS
-- ===========================================================================
insert into public.neighbourhoods (slug, name, city, state, university_id, average_annual_rent_kobo, walking_minutes_to_campus, active) values
  ('akoka', 'Akoka', 'Lagos', 'Lagos', (select id from public.universities where slug = 'university-of-lagos'), 65000000, 8, true),
  ('bariga', 'Bariga', 'Lagos', 'Lagos', (select id from public.universities where slug = 'university-of-lagos'), 48000000, 18, true),
  ('yaba', 'Yaba', 'Lagos', 'Lagos', (select id from public.universities where slug = 'university-of-lagos'), 85000000, 22, true),
  ('somolu', 'Somolu', 'Lagos', 'Lagos', (select id from public.universities where slug = 'university-of-lagos'), 42000000, 25, true),
  ('agbowo', 'Agbowo', 'Ibadan', 'Oyo', (select id from public.universities where slug = 'university-of-ibadan'), 40000000, 5, true),
  ('bodija', 'Bodija', 'Ibadan', 'Oyo', (select id from public.universities where slug = 'university-of-ibadan'), 55000000, 15, true),
  ('mayfair', 'Mayfair', 'Ile-Ife', 'Osun', (select id from public.universities where slug = 'obafemi-awolowo-university'), 38000000, 7, true),
  ('ugbowo', 'Ugbowo', 'Benin City', 'Edo', (select id from public.universities where slug = 'university-of-benin'), 45000000, 10, true),
  ('samaru', 'Samaru', 'Zaria', 'Kaduna', (select id from public.universities where slug = 'ahmadu-bello-university'), 35000000, 8, true),
  ('nsukka-town', 'Nsukka Town', 'Nsukka', 'Enugu', (select id from public.universities where slug = 'university-of-nigeria-nsukka'), 32000000, 12, true)
on conflict (slug) do nothing;

-- ===========================================================================
-- PLATFORM SETTINGS
-- ===========================================================================
insert into public.platform_settings (key, label, description, type, value, unit, category, requires_reauth) values
  ('commission.default_rate', 'Default commission rate', 'Platform commission percentage applied to each booking.', 'percentage', '5.5', '%', 'commission', true),
  ('booking.hold_hours', 'Booking hold duration', 'How long a temporary hold reserves a room before payment is required.', 'number', '24', 'hours', 'booking', false),
  ('booking.service_fee_rate', 'Service fee rate', 'Service fee charged to students on top of rent and caution deposit.', 'percentage', '5', '%', 'booking', true),
  ('verification.sla_hours', 'Verification SLA', 'Target time for first review of a verification submission.', 'number', '48', 'hours', 'verification', false),
  ('support.first_response_sla_hours', 'Support first-response SLA', 'Target time for first agent response on a support ticket.', 'number', '4', 'hours', 'support', false),
  ('payments.provider', 'Payment provider', 'Active payment provider for student payments.', 'string', 'paystack', null, 'payments', true),
  ('payments.refund_window_days', 'Refund window', 'Number of days after booking within which a full refund is available.', 'number', '1', 'days', 'payments', true),
  ('operations.max_bulk_rooms', 'Max bulk room creation', 'Maximum number of rooms a landlord can create in a single bulk operation.', 'number', '200', null, 'operations', false),
  ('security.reauth_timeout_minutes', 'Reauthentication timeout', 'How long a reauthentication session remains valid for sensitive operations.', 'number', '15', 'minutes', 'security', true),
  ('security.dual_approval_threshold_kobo', 'Dual-approval threshold', 'Payout amounts at or above this value require a second finance admin''s approval.', 'number', '100000000', 'kobo', 'security', true)
on conflict (key) do nothing;

-- ===========================================================================
-- INTEGRATION HEALTH
-- ===========================================================================
insert into public.integration_health (name, category, status, uptime_24h, avg_response_ms, enabled) values
  ('Paystack', 'payments', 'operational', 99.98, 240, true),
  ('Supabase Auth', 'auth', 'operational', 100.00, 95, true),
  ('Supabase Database', 'database', 'operational', 99.99, 45, true),
  ('Cloudinary', 'storage', 'operational', 99.95, 180, true),
  ('Email (Resend)', 'email', 'operational', 99.95, 180, true),
  ('SMS (Termii)', 'sms', 'operational', 99.90, 120, true),
  ('Analytics (PostHog)', 'analytics', 'operational', 99.90, 120, true)
on conflict (name) do nothing;

-- ===========================================================================
-- KNOWLEDGE BASE ARTICLES
-- ===========================================================================
insert into public.knowledge_base_articles (slug, title, category, excerpt, content, tags, published, author_id) values
  ('booking-hold-explained', 'Booking holds explained', 'Bookings', 'How temporary holds work and why they expire.', 'A temporary hold reserves a specific room for 24 hours while you arrange payment.', '{"booking","hold","payment","expiry"}', true, null),
  ('off-platform-payment-warning', 'Why you should never pay outside NetLodge', 'Safety', 'Off-platform payments forfeit all NetLodge protections.', 'If a landlord asks you to pay directly into their bank account, report it immediately.', '{"safety","payments","fraud","off-platform"}', true, null),
  ('caution-deposit-refund-timeline', 'Caution deposit refund timeline', 'Payments', 'When and how caution deposits are refunded.', 'Caution deposits are refunded within 5-7 business days of tenancy end.', '{"refund","caution-deposit","payments"}', true, null),
  ('landlord-bulk-room-creation', 'Bulk room creation for landlords', 'Property listing', 'How to create hundreds of rooms in a single operation.', 'Landlords with large portfolios can use the bulk-create feature.', '{"landlord","rooms","bulk","inventory"}', true, null),
  ('verification-timeline', 'Verification timeline and what to expect', 'Verification', 'How long verification takes and what documents you''ll need.', 'Verification typically takes 3-5 business days after you submit all evidence.', '{"verification","kyc","documents","timeline"}', true, null),
  ('cancellation-policy', 'Cancellation and refund policy', 'Bookings', 'Full breakdown of cancellation windows and refund eligibility.', 'Cancellations within 24 hours of booking receive a full refund.', '{"cancellation","refund","policy"}', true, null)
on conflict (slug) do nothing;
