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
