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
