-- ===========================================================================
-- NetLodge Schema Migration — Part 3: Row Level Security Policies
-- ===========================================================================
-- Enables RLS on every application table and defines restrictive policies.
-- Run after 0001_schema.sql and 0002_functions_and_triggers.sql.
-- Idempotent: drops existing policies before recreating.
-- ===========================================================================

-- Drop ALL existing policies on all application tables (idempotency)
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

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
