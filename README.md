# NetLodge

> Verified student accommodation around Nigerian universities. Book the actual room — not just the building.

NetLodge is a Nigerian student accommodation marketplace where students discover, compare and book individual rentable units (rooms, self-contain units, bed spaces, apartments) around universities. Landlords list properties, organise hundreds of rooms by floor, manage bookings, and receive payouts. Property managers operate assigned properties; agents manage enquiries and referrals.

This repository contains the **complete frontend** — a Next.js 16 application built from scratch with a distinctive emerald-and-amber visual identity, full light/dark theming, role-specific dashboards for students, landlords, managers and agents, and a backend-ready architecture that connects cleanly to Supabase, Cloudinary and Paystack.

---

## Status

- **Frontend**: complete — all 50+ routes implemented and interactive.
- **Backend**: not connected. The app runs in `dev` adapter mode using deterministic, clearly-labelled fixtures. Switch to `prod` adapter mode by implementing the contracts in [`/docs/integration-contracts.md`](./docs/integration-contracts.md).

---

## Tech stack

- **Framework**: Next.js 16 with App Router, React Server Components by default.
- **Language**: TypeScript 5 in strict mode.
- **Styling**: Tailwind CSS 4 with shadcn/ui (New York style) and Radix UI primitives.
- **Icons**: lucide-react.
- **Forms**: React Hook Form + Zod.
- **State**: TanStack Query for server state, React context for auth.
- **Theming**: next-themes with light/dark/system, anti-flash hydration script.
- **Fonts**: Plus Jakarta Sans (body + display) + JetBrains Mono (code/mono).
- **Backend-ready**: typed repository contracts in `src/lib/repositories/contracts.ts`; dev adapter in `src/lib/repositories/dev-adapter.ts`; Supabase + Cloudinary + Paystack integration documented.

---

## Getting started

### Prerequisites
- Node.js 18+ (or Bun)
- A package manager (Bun is used in this repo)

### Install & run
```bash
bun install
bun run dev          # http://localhost:3000
```

### Other scripts
```bash
bun run lint         # ESLint
bun run build        # Production build
bun run db:push      # Push Prisma schema (used by some server actions)
```

### Environment
Copy `.env.example` to `.env` and configure for your target environment. The
default (`NEXT_PUBLIC_REPOSITORY_ADAPTER=dev`) requires no external services.

---

## Project structure

```
src/
├── app/
│   ├── (public)/                 # Public marketplace shell (header + footer)
│   │   ├── page.tsx              # Homepage
│   │   ├── universities/
│   │   ├── search/
│   │   ├── properties/
│   │   ├── rooms/[id]/
│   │   ├── how-it-works/
│   │   ├── safety/
│   │   ├── help/
│   │   ├── contact/
│   │   ├── terms/
│   │   ├── privacy/
│   │   └── cookies/
│   ├── (auth)/                   # Authentication shell (split-panel layout)
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── auth/callback/
│   ├── (student)/                # Student dashboard shell (sidebar)
│   │   └── student/
│   ├── (landlord)/               # Landlord dashboard shell
│   │   └── landlord/
│   ├── (manager)/                # Manager dashboard shell
│   │   └── manager/
│   ├── (agent)/                  # Agent dashboard shell
│   │   └── agent/
│   ├── layout.tsx                # Root layout — providers, fonts, metadata
│   ├── globals.css               # NetLodge design system (CSS variables)
│   ├── error.tsx                 # Error boundary
│   ├── loading.tsx               # Route-level loading
│   ├── not-found.tsx             # 404 page
│   ├── sitemap.ts                # Dynamic sitemap
│   └── robots.ts
├── components/
│   ├── ui/                       # shadcn/ui primitives (already provided)
│   ├── shared/                   # Cross-cutting: RoleShell, ThemeToggle, Logo, badges, price, page components
│   ├── public/                   # SiteHeader, SiteFooter, HeroSearch, PropertyCard, UniversityCard, RoomBookingCard, search content
│   ├── student/                  # (Reserved for student-specific components)
│   ├── landlord/                 # (Reserved for landlord-specific components)
│   ├── manager/
│   └── agent/
├── lib/
│   ├── types/                    # Domain types (single source of truth)
│   ├── data/fixtures.ts          # DEV FIXTURES — clearly labelled, not real
│   ├── repositories/             # Repository contracts + dev adapter
│   ├── auth/                     # Auth context (dev) + permissions model
│   ├── validators/               # Zod schemas for every form
│   └── utils/                    # format.ts (NGN/kobo, dates, slugs), cn.ts
└── docs/
    └── integration-contracts.md  # Supabase/Cloudinary/Paystack contracts
```

---

## Implemented routes

### Public marketplace (16 routes)
- `/` — Homepage with hero, search, universities, featured listings, manually-controlled carousel, accommodation categories, verification explanation, student benefits, landlord onboarding, FAQs, testimonial, CTA, footer
- `/universities` — University directory
- `/universities/[slug]` — University accommodation discovery
- `/search` — Search results with working filters (university, neighbourhood, budget, unit type, facilities, sort), URL synchronisation, loading/empty/error states
- `/properties` — Property directory
- `/properties/[slug]` — Property details with tabs (overview, rooms, facilities, rules) and booking sidebar
- `/rooms/[id]` — Individual rentable unit details with booking initiator (hold + Paystack handoff)
- `/how-it-works`, `/safety`, `/help`, `/contact`, `/terms`, `/privacy`, `/cookies`

### Auth (5 routes)
- `/login` (with quick-access demo accounts for all 4 roles)
- `/register` (with role selection)
- `/forgot-password`, `/reset-password`, `/auth/callback`

### Student app (10 routes)
- `/student` — Dashboard with stats, recent bookings, notifications, saved properties, quick actions
- `/student/search`, `/student/saved`, `/student/bookings`, `/student/bookings/[id]` (with secure 8-step workflow tracker and Paystack handoff)
- `/student/payments` (with backend-verified statuses and receipt download)
- `/student/notifications`, `/student/profile`, `/student/security`, `/student/settings`, `/student/support`

### Landlord app (22 routes)
- `/landlord` — Dashboard with verification banner, stats, properties, bookings, payouts, quick actions
- `/landlord/onboarding` — 5-step getting-started guide
- `/landlord/properties`, `/landlord/properties/new` (6-step property wizard with draft saving)
- `/landlord/properties/[id]` (with tabs for overview/floors/rooms/bookings/settings)
- `/landlord/properties/[id]/edit`, `/landlord/properties/[id]/floors`, `/landlord/properties/[id]/rooms`
- `/landlord/rooms/new`, `/landlord/rooms/[id]`, `/landlord/rooms/[id]/edit`
- `/landlord/bookings`, `/landlord/bookings/[id]`
- `/landlord/availability`, `/landlord/pricing` (floor defaults + per-room overrides)
- `/landlord/transactions`, `/landlord/payouts`, `/landlord/staff`, `/landlord/verification`, `/landlord/reports`, `/landlord/notifications`, `/landlord/profile`, `/landlord/settings`

### Manager app (9 routes)
- `/manager` — Dashboard scoped to assigned properties
- `/manager/properties`, `/manager/properties/[id]`, `/manager/rooms`, `/manager/bookings`, `/manager/bookings/[id]`, `/manager/availability`, `/manager/inspections`, `/manager/notifications`, `/manager/profile`, `/manager/settings`

### Agent app (8 routes)
- `/agent` — Dashboard with assignments, enquiries, referral metrics
- `/agent/assignments`, `/agent/properties`, `/agent/enquiries`, `/agent/referrals`, `/agent/notifications`, `/agent/profile`, `/agent/settings`

---

## Design system

The NetLodge visual identity is a premium PropTech look inspired by the Nigerian landscape — deep emerald primary, warm amber accent, cream and charcoal neutrals. Tokens are defined as CSS custom properties in `src/app/globals.css` and mapped into Tailwind's `@theme inline` for utility classes.

- **Primary**: emerald (`oklch(0.45 0.13 165)` light, `oklch(0.7 0.16 160)` dark)
- **Accent**: warm amber (`oklch(0.94 0.05 80)` light, `oklch(0.32 0.06 65)` dark)
- **Semantic**: success (green), warning (amber), info (blue), destructive (red) — all in both themes.
- **Typography**: Plus Jakarta Sans for body and display (weights 400–800), JetBrains Mono for code.
- **Radii**: 0.75rem base, with sm/md/lg/xl/2xl variants.
- **Shadows**: subtle, layered.
- **Patterns**: `bg-grid-pattern` and `bg-dot-pattern` utilities for hero backgrounds.

### Theme support
- Light, dark and system themes via `next-themes`.
- Anti-flash inline script in `layout.tsx` applies the persisted theme before paint.
- Visible theme switcher in the public header and every role shell.
- Theme persists across sessions via `localStorage["netlodge-theme"]`.

---

## Domain model

The bookable entity is the **rentable unit**, not the building. A two-bedroom apartment rented as one unit is modelled as a single `RentableUnit` with `unitType: "apartment"` and `bedrooms: 2`, not as two independently bookable rooms.

Money is stored as **integer kobo** (1 NGN = 100 kobo) in all backend-facing models. Display helpers in `src/lib/utils/format.ts` convert kobo to NGN strings for the UI.

Full type definitions: `src/lib/types/index.ts`.

---

## Security model

### Frontend (this repo)
- The `useAuth()` hook stores a development session in `localStorage` for UI preview only. It is **not** a security boundary.
- The `can(role, action)` helper in `src/lib/auth/permissions.ts` decides which UI affordances to show.
- The booking flow's "secure workflow tracker" (visible on `/student/bookings/[id]`) is purely informational — only the backend can transition between steps.
- The frontend may render a payment as `initiated` or `pending`, but **never** as `successful` without backend confirmation.
- The frontend never exposes identity documents, exact room addresses, or payment credentials in public metadata.

### Backend (production — see `docs/integration-contracts.md`)
- Supabase Row-Level Security (RLS) policies are the source of truth for role-based access.
- Paystack webhooks (signed with `PAYSTACK_WEBHOOK_SECRET`) confirm payments.
- Verification can only be approved by a `verification_officer` role — never by the landlord.

---

## Demo data

All data in `src/lib/data/fixtures.ts` is **fictitious and clearly labelled**. No real properties, landlords, bookings, payments, verifications, reviews or partner relationships are represented. Properties, room identifiers, references and amounts are deterministic for repeatable UI testing.

Switch to the production adapter by setting `NEXT_PUBLIC_REPOSITORY_ADAPTER=prod` and implementing `src/lib/repositories/prod-adapter.ts` per the contracts in `docs/integration-contracts.md`.

---

## Quality

- Lint: `bun run lint` — passes with 0 errors. (Warnings are React Hook Form `watch()` "incompatible library" notices from React Compiler, which do not affect functionality.)
- Build: `bun run build` — succeeds.
- Browser-verified: the homepage, property detail, room detail, theme switching, login, and landlord room management pages have all been interacted with in a real browser via Agent Browser.

---

## What's next

The frontend is feature-complete. Outstanding work for a production launch is documented in [`docs/integration-contracts.md`](./docs/integration-contracts.md):

1. Provision Supabase project + database schema.
2. Implement RLS policies.
3. Implement server actions for auth, bookings, payments, verification, payouts.
4. Configure Cloudinary signed uploads.
5. Configure Paystack webhooks and verification endpoints.
6. Add email templates for transactional emails.
7. Add cron jobs for hold expiry and payout settlement.
8. Have the Terms and Privacy documents reviewed by a qualified Nigerian lawyer.

---

## License

© NetLodge Technologies Ltd. All rights reserved. Demo data is fictitious.
