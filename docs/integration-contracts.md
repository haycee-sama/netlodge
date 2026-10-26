# NetLodge — Integration Contracts

This document specifies the backend contracts required to take NetLodge from
the development adapter (deterministic fixtures) to a production deployment
backed by Supabase, Cloudinary and Paystack.

The frontend is built so that the **same TypeScript interfaces** in
`src/lib/repositories/contracts.ts` are satisfied by both the dev adapter
(`src/lib/repositories/dev-adapter.ts`) and the production adapter (to be
implemented as `src/lib/repositories/prod-adapter.ts`). Switching is controlled
by `NEXT_PUBLIC_REPOSITORY_ADAPTER`.

---

## 1. Authentication — Supabase Auth

### Frontend contract
- `useAuth()` from `@/lib/auth/auth-context` returns `{ session, signIn, signOut, switchRole }`.
- In dev mode, `signIn` writes a session to localStorage. **This is for UI preview only.**
- In production, `signIn` must exchange credentials with Supabase Auth via `supabase.auth.signInWithPassword()` (or `signInWithOtp` for magic links).

### Required Supabase setup
- Enable Email/Password and (optionally) OAuth providers in the Supabase dashboard.
- Configure email redirects to `https://netlodge.example/auth/callback`.
- Use Supabase Row-Level Security (RLS) policies to enforce role-based access at the database level — **never rely on the frontend `role` field for security.**
- Define a `profiles` table linked to `auth.users` with columns: `id` (uuid, FK to `auth.users.id`), `role` (enum: `student`, `landlord`, `manager`, `agent`, plus reserved roles for future phases), `first_name`, `last_name`, `phone`, `email_verified_at`, `phone_verified_at`, `created_at`.

### Reserved roles (excluded from this implementation phase but kept in the schema)
- `verification_officer`
- `support_staff`
- `finance_admin`
- `super_admin`

### Server actions to implement
- `auth/register` — creates auth user + profile row
- `auth/login` — exchanges credentials for session
- `auth/forgot-password` — sends reset email via Supabase
- `auth/reset-password` — updates password after token exchange
- `auth/sign-out` — revokes session

---

## 2. Database schema (Postgres via Supabase)

The following tables are required. Naming follows the TypeScript types in
`src/lib/types/index.ts`.

### `universities`
- `id` uuid PK
- `slug` text unique
- `name`, `short_name`, `city`, `state` text
- `latitude`, `longitude` numeric nullable
- `description` text
- `logo_url` text nullable
- `total_listings` int (denormalised for performance)
- `popular_neighbourhoods` text[]
- `created_at`, `updated_at` timestamptz

### `neighbourhoods`
- `id`, `slug`, `name`, `city`, `state`
- `university_id` FK → `universities.id`
- `average_annual_rent_kobo` bigint nullable
- `walking_minutes_to_campus` int nullable
- `total_listings` int
- `image_url` text nullable

### `properties`
- `id`, `slug`, `landlord_id` FK → `profiles.id`
- `name`, `description`, `type` enum, `status` enum, `verification_status` enum
- `city`, `state`, `neighbourhood_id`, `university_id`
- `public_address_line`, `private_address_line` text
- `latitude`, `longitude` numeric nullable
- `facilities` facility[]
- `rules` jsonb
- `images` jsonb (array of `{id, url, alt_text, is_verified, caption, position}`)
- `total_floors`, `total_units`, `available_units`, `occupied_units`, `held_units` int
- `price_from_kobo` bigint
- `manager_ids` uuid[] (FK to profiles, scoped by RLS)
- `agent_ids` uuid[]
- `created_at`, `updated_at`

### `floors`
- `id`, `property_id` FK, `label`, `level` int, `description`
- `default_price_kobo` bigint nullable
- `total_units`, `available_units` int (denormalised)
- `position` int

### `rentable_units` (rooms, self-contain, apartments, bed spaces)
- `id`, `identifier`, `slug`, `property_id` FK, `floor_id` FK
- `unit_type` enum, `status` enum
- `capacity`, `bedrooms`, `bathrooms` int
- `has_balcony`, `has_window` boolean
- `size_sq_m` numeric nullable
- `facilities` facility[]
- `furnishing` enum
- `images` jsonb
- `representative_images_only` boolean
- `annual_rent_kobo` bigint
- `rental_period` enum
- `additional_charges` jsonb
- `caution_deposit_kobo` bigint nullable
- `available_from`, `available_to` timestamptz nullable
- `booking_terms` text
- `active_hold_id`, `active_booking_id` uuid nullable
- `created_at`, `updated_at`

### `bookings`
- `id`, `reference` unique
- `student_id`, `property_id`, `rentable_unit_id` FK
- `status` enum, `current_step` enum
- `check_in`, `check_out` date
- `rental_period` enum
- `base_rent_kobo`, `additional_charges_kobo`, `caution_deposit_kobo`, `service_fee_kobo`, `total_kobo`, `paid_kobo`, `outstanding_kobo` bigint
- `hold_expires_at`, `confirmed_at`, `cancelled_at`, `cancellation_reason`
- `created_at`, `updated_at`

### `payments`
- `id`, `reference` unique
- `gateway_reference` nullable (Paystack)
- `booking_id`, `student_id` FK
- `amount_kobo`, `fee_kobo`, `net_kobo` bigint
- `currency` text (always "NGN")
- `channel` enum
- `status` enum
- `confirmed_by_backend` boolean (the source of truth — frontend may not flip this)
- `initiated_at`, `confirmed_at`, `failure_reason`, `receipt_url`

### `payouts`
- `id`, `reference` unique
- `landlord_id`, `booking_id` FK
- `gross_kobo`, `platform_fee_kobo`, `net_kobo` bigint
- `status` enum
- `settled_at` timestamptz nullable (only populated by backend)
- `bank_account_masked` text
- `scheduled_for`, `created_at`

### `verification_records`
- `id`, `entity_type` enum, `entity_id` uuid
- `status` enum
- `evidence` jsonb
- `inspection_records` jsonb
- `submitted_at`, `reviewed_at`, `reviewer_id`, `review_notes`
- `outstanding_actions` text[]

### `notifications`, `support_tickets`, `support_ticket_replies`, `saved_properties`
— match the TypeScript types in `src/lib/types/index.ts`.

---

## 3. Image handling — Cloudinary

### Frontend contract
- Property and room images are stored in Cloudinary.
- The browser never sees Cloudinary API credentials.

### Required server endpoints
- `POST /api/uploads/sign` — returns a signed upload URL for a single image.
  Request body: `{ folder: "properties/<id>" | "rooms/<id>" | "evidence/<user_id>", filename, contentType }`.
  Response: `{ uploadUrl, publicId, signature, timestamp }`.
- The browser POSTs the file directly to Cloudinary using the signed URL.
- After upload, the browser submits the resulting `publicId` to a server action that stores it in the relevant table.

### Image optimisation
- Use Cloudinary's URL transformations for responsive sizing: `f_auto,q_auto,w_<width>` etc.
- Always require alt text from the uploader.
- Mark images as "verified" only after the property passes inspection.

---

## 4. Payments — Paystack

### Frontend contract
- The frontend may render a Paystack inline checkout using the **public key**.
- The frontend may display a payment as `initiated` or `pending`, but **never** as `successful`.
- The status `successful` is only set by the backend, either:
  1. via Paystack's webhook → server route handler, or
  2. via a server-side `verify` call to Paystack's API.

### Required server endpoints
- `POST /api/payments/initiate` — body `{ bookingId, channel }`. Returns `{ paymentReference, paystackAuthorizationUrl }`.
- `POST /api/paystack/webhook` — receives Paystack events. Verifies signature using `PAYSTACK_WEBHOOK_SECRET`. On `charge.success`, flips the corresponding payment's `confirmed_by_backend` to true and the booking's `status` to `confirmed`.
- `POST /api/payments/verify` (optional, idempotent fallback) — calls Paystack's `GET /transaction/verify/:reference` and reconciles.

### Transaction flow (server-controlled)
1. **Availability check** — atomic SQL query on `rentable_units.status = 'available'`.
2. **Temporary hold** — `INSERT INTO holds (...)` with `expires_at = now() + 24h`. Update `rentable_units.status = 'held'`.
3. **Booking creation** — `INSERT INTO bookings (...)` with `status = 'pending_payment'`, `current_step = 'booking_creation'`.
4. **Payment initiation** — call Paystack `POST /transaction/initialize`. Store `gateway_reference` in `payments`.
5. **Payment confirmation** — Paystack webhook fires `charge.success`. Server verifies signature, calls Paystack verify, flips `payments.confirmed_by_backend = true`, `payments.status = 'successful'`, `bookings.status = 'confirmed'`, `bookings.current_step = 'booking_confirmation'`, releases `holds`, sets `rentable_units.status = 'occupied'`.
6. **Payment reconciliation** — periodic job (cron) reconciles fees, refunds, and creates `payouts` rows.
7. **Payout settlement** — when bank transfer completes, `payouts.status = 'settled'`, `payouts.settled_at = now()`.

### Refunds
- Initiated via `POST /api/refunds` (server-only). Calls Paystack `POST /refund`.
- Webhook event `refund.processed` updates `payments.status = 'refunded'`, `bookings.status = 'refunded'`.

---

## 5. Verification — never self-approved

- Landlords submit evidence via `POST /api/verification/submit` (server action).
- Files upload to Cloudinary via signed URL (folder `evidence/<user_id>`).
- The `verification_records.status` field can only be flipped to `approved` by a `verification_officer` role (reserved for future phase) via a server action.
- The frontend explicitly **does not** provide a self-approve button. The landlord's verification page only displays status, evidence, and inspection records.

---

## 6. Role-based access — RLS policies (Supabase)

| Table              | student                | landlord                              | manager                              | agent                          |
|--------------------|------------------------|---------------------------------------|--------------------------------------|--------------------------------|
| profiles           | own row only           | own row                               | own row                              | own row                        |
| properties         | public read (verified) | own + managed                         | assigned only                        | assigned only                  |
| floors             | public read (verified) | own                                   | assigned properties                  | no access                      |
| rentable_units     | public read (verified) | own                                   | assigned properties (read/update)    | read only                      |
| bookings           | own                    | own properties                        | assigned properties (status updates) | own referrals only             |
| payments           | own                    | own properties (read-only)            | no access                            | no access                      |
| payouts            | no access              | own                                   | no access                            | no access                      |
| verification       | no access              | own (read + submit, never approve)    | no access                            | no access                      |
| notifications      | own                    | own                                   | own                                  | own                            |
| support_tickets    | own                    | own                                   | own                                  | own                            |
| saved_properties   | own                    | n/a                                   | n/a                                  | n/a                            |

**Critical**: RLS policies are the source of truth. The frontend `can()` helper
in `src/lib/auth/permissions.ts` only decides which UI affordances to *show*.

---

## 7. Adapter implementation checklist

To ship the production adapter (`src/lib/repositories/prod-adapter.ts`):

1. Install `@supabase/supabase-js` and `@supabase/ssr`.
2. Create `src/lib/supabase/client.ts` (browser) and `src/lib/supabase/server.ts` (server components / route handlers).
3. Implement each method on the `Repositories` interface by calling Supabase queries (with RLS enforced).
4. Replace the body of `getRepositories()` in `src/lib/repositories/index.ts` to return `prodRepositories` when `NEXT_PUBLIC_REPOSITORY_ADAPTER === 'prod'`.
5. Move all server-side mutations (booking confirm, payment verify, verification approve, payout settle) behind server actions or route handlers — never client-side Supabase calls with privileged keys.
6. Add webhook routes for Paystack (`/api/paystack/webhook`) and (optional) Cloudinary notifications.
7. Run the test suite against the prod adapter in a staging environment.

---

## 8. Outstanding backend requirements (for launch)

The frontend is complete. The following backend items are required before a genuine production launch:

- [ ] Supabase project provisioned with the schema above.
- [ ] RLS policies implemented and tested.
- [ ] Email templates for: welcome, password reset, email verification, booking confirmation, payout settlement, verification update.
- [ ] Cloudinary account and signed-upload endpoint.
- [ ] Paystack business account, public + secret keys, webhook secret configured.
- [ ] Server actions for: registration, login, password reset, booking initiation, payment initiation, payment verification, refund, payout settlement, verification submission, verification approval (by `verification_officer` role).
- [ ] Cron job for hold expiry (releases holds past `expires_at`).
- [ ] Cron job for payout settlement (moves scheduled payouts to `in_flight` then `settled` based on bank confirmation).
- [ ] Monitoring: Sentry for errors, Supabase logs for database events, Paystack dashboard for payment anomalies.
- [ ] Privacy & Terms reviewed by a qualified Nigerian lawyer (the documents in `/terms` and `/privacy` are illustrative templates).
