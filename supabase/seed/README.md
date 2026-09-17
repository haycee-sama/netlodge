# NetLodge — Seed Data

Phase 0 ships **no seed scripts**. The first seed data lands in Phase 1
(university seeding for the launch target) per `IMPLEMENTATION_PLAN.md` §24.

## Hard rules (IMPLEMENTATION_PLAN §24)

- **Never** real personal data — names, emails, phone numbers of real people.
- **Never** real government ID documents.
- **Never** real payment credentials — Paystack sandbox/test keys only.
- **Never** real landlord photos.

Seed data exists to exercise specific application states during development
(e.g., a landlord at each verification status, a booking in each lifecycle
state). It does **not** migrate to production.

## Production boundary

Production starts with:

- One real university (the launch target).
- Zero fake accounts.
- Zero seeded bookings/payments.

This is non-negotiable per the planning documents — production trustworthiness
depends on it.
