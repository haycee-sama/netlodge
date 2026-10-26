---
Task ID: netlodge-full-build
Agent: main (GLM)
Task: Build NetLodge — a complete Nigerian student accommodation marketplace frontend from scratch using Next.js 16, TypeScript, Tailwind 4 and shadcn/ui.

Work Log:
- Loaded the fullstack-dev skill and initialised the project (Next.js 16 + TS + Tailwind 4 + full shadcn/ui already provided).
- Designed a distinctive NetLodge visual identity: emerald primary + warm amber accent + cream/charcoal neutrals, with full light/dark themes via next-themes and an anti-flash hydration script.
- Built foundation: domain types (`src/lib/types/index.ts`), Zod validators (`src/lib/validators/index.ts`), dev fixtures clearly labelled as DEMO data (`src/lib/data/fixtures.ts`), typed repository contracts (`src/lib/repositories/contracts.ts`), dev adapter (`dev-adapter.ts`), formatter utilities (NGN/kobo, dates, slugs), auth context with explicit security caveats, and a permission model with extensible reserved roles.
- Built shared components: RoleShell (sidebar + header for all 4 role apps), SiteHeader, SiteFooter, ThemeToggle, Logo, PageHeader, EmptyState, StatCard, SectionHeading, status badges (booking/payment/payout/room/property/verification), and Price (kobo→NGN).
- Built the public marketplace: 16 routes including homepage (14 sections), universities directory + detail, search (with URL-synced filters and facets), properties directory + detail, room detail with booking initiator (server-controlled hold + Paystack handoff), how-it-works, safety, help, contact, terms, privacy, cookies.
- Built auth shell with split-panel layout: login (with quick-access demo accounts for all 4 roles), register (with role selector), forgot-password, reset-password, auth/callback.
- Built student app (10 routes): dashboard, search, saved, bookings, booking detail (with secure 8-step workflow tracker), payments, notifications, profile, security, settings, support (with ticket creation).
- Built landlord app (22 routes): dashboard, onboarding, properties list, 6-step property wizard (with draft saving), property detail with tabs, edit, floors management, rooms management (table + grid views, bulk create up to 200 rooms, bulk price override, per-floor defaults), single room create, room detail + edit, bookings list + detail, availability, pricing, transactions, payouts, staff, verification (no self-approve), reports (with revenue chart), notifications, profile, settings.
- Built manager app (9 routes): dashboard, properties, property detail, rooms, bookings, booking detail, availability, inspections (with recording), notifications, profile, settings — all scoped to assigned properties only.
- Built agent app (8 routes): dashboard, assignments, properties, enquiries (with response dialog), referrals (with copy-link + earnings), notifications, profile, settings — agents have no access to pricing, payments, ownership or verification.
- SEO: dynamic `sitemap.ts`, `robots.ts` (with disallow on private routes), route-specific metadata, OpenGraph, canonical URLs, custom 404, error boundary, loading state, favicon and webmanifest.
- Documentation: comprehensive README, `.env.example` with all required vars, and `/docs/integration-contracts.md` detailing Supabase schema, Cloudinary signed uploads, Paystack webhook flow, RLS policy matrix, and adapter implementation checklist.
- Verified via Agent Browser: homepage renders with all 14 sections, theme toggle works (dark class applied), property detail tabs work, room detail shows booking button, login flow redirects to landlord dashboard, rooms management page renders with bulk operations.

Stage Summary:
- **Routes implemented**: 60+ across 5 route groups (public, auth, student, landlord, manager, agent) — all returning 200 OK.
- **Lint**: 0 errors, 3 warnings (all React Compiler notices about React Hook Form `watch()` — non-functional).
- **Build**: dev server runs cleanly on port 3000 with no fatal errors.
- **Browser-verified**: homepage, property detail, room detail, theme switching, login, and landlord rooms management all interactive.
- **Key architectural decisions**:
  - Rentable unit (not building) is the bookable entity — modelled in `RentableUnit` type with `unitType` supporting `self_contain`, `single_room`, `shared_room`, `bed_space`, `apartment`, `studio`.
  - Money stored as integer kobo everywhere; display helpers convert to NGN.
  - Frontend never declares payments successful or bookings confirmed — only backend can.
  - Verification cannot be self-approved — the landlord page only displays status.
  - Role-aware sidebar + header via `RoleShell` shared component.
  - Permission model in `permissions.ts` is UI-only; RLS policies are the source of truth (documented).
- **Production blockers documented** in `/docs/integration-contracts.md`: Supabase provisioning, RLS, server actions, Cloudinary signed uploads, Paystack webhooks, email templates, cron jobs for hold expiry + payout settlement, legal review of Terms/Privacy.
