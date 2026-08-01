# Netlodge

**Verified student housing in Nigeria.** Netlodge connects Nigerian university students with landlords who have been manually verified, and protects every booking with an escrow-based payment flow — built to eliminate the fraud that has historically plagued off-campus student housing.

Live cities at launch: **Abuja · Lagos · Enugu**

---

## Table of Contents

- [What Netlodge Does](#what-netlodge-does)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Route Map](#route-map)
- [Data Layer](#data-layer)
- [Core Flows](#core-flows)
- [Design System Notes](#design-system-notes)
- [Accessibility](#accessibility)
- [SEO](#seo)
- [Getting Started](#getting-started)

---

## What Netlodge Does

**For students**
- Search verified properties by city, university, room type, and budget
- Browse a property's blocks and individual rooms, with photos, amenities, and pricing
- Book a room with a choice of lease duration (1 Year, Per Semester, Half Year — landlord-configurable)
- Pay via card, bank transfer, or USSD through an escrow flow (Paystack-style)
- Money sits in escrow for **48 hours** after payment so the student can confirm the room matches the listing before funds are released
- File a dispute within the 48-hour window for a full refund if something's wrong
- Manage bookings, saved rooms, profile, and lifestyle preferences (used for a future AI roommate/room-matching engine) from a student dashboard

**For landlords**
- Register and submit KYC (government ID + Certificate of Occupancy/deed + geo-tagged property photos + NIN/BVN)
- Get manually verified by an admin team (target: 48 hours)
- Create properties → blocks → rooms, each with its own photos (min. 5), amenities, pricing, and lease options
- Track bookings, occupancy, and revenue from a dedicated landlord dashboard
- Configure default lease durations, minimum stay policy, and lease-expiry reminder windows platform-wide
- Receive payouts to a registered Nigerian bank account automatically once the escrow window closes without a dispute (service fee taken from the student side, not the landlord's rent)

**Trust & Safety mechanics baked into the product**
- Every landlord verified via government ID + property ownership docs before they can list
- Every listing manually approved — no self-serve publishing
- Escrow payment, 48-hour dispute window, full refund on a founded dispute
- Landlord contact details are only revealed to a student after a successful payment (prevents off-platform contact/scamming before money changes hands)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js (App Router)** — route groups, nested layouts, `loading.jsx` / `error.jsx` / `not-found.jsx` conventions |
| Styling | **Tailwind CSS** |
| Animation | **Framer Motion** (`motion`, `AnimatePresence`, `useReducedMotion`) |
| Icons | **lucide-react** |
| Images | `next/image` for real content, plain `<img>` where drag/gesture physics require it (e.g. the gallery modal) |
| State | Local component state (`useState`) — no global store yet; all data is mocked |
| Data | Centralized mock data module (`app/lib/data.js`) acting as a single source of truth pending a real backend |

There is currently **no backend / database / auth provider wired up** — every "API call" in the codebase is a `setTimeout` standing in for a real request (clearly commented, e.g. `// In the real app: POST /api/auth/signup`).

---

## Project Structure

```
app/
├── (public)/                  # Marketing + browsing, has Navbar + Footer
│   ├── page.js                 # Homepage
│   ├── about/                  # How Netlodge works (student + landlord journeys, escrow explainer)
│   ├── faq/                    # Accordion FAQ (student + landlord sections)
│   ├── contact/                # Support contact form
│   ├── search/                 # Property search + filters
│   ├── property/[id]/          # Property detail, block/room picker (PropertyBookingPanel)
│   ├── rooms/[id]/              # Single room detail, image carousel + gallery modal, booking panel
│   └── components/             # CountUpStat, FeaturedCarousel, CityCoverageGrid
│
├── (student)/                  # Student portal, Navbar only (no Footer)
│   ├── dashboard/               # Student home base
│   ├── booking/                 # confirm → pay → success (multi-step, BookingProgress bar)
│   │   └── components/BookingProgress.jsx
│   ├── saved/                   # Saved/shortlisted rooms
│   └── profile/                 # Personal info, password, notifications, lifestyle prefs
│
├── (auth)/                     # No shared chrome — pages use AuthLayout directly
│   ├── login/
│   ├── signup/student/
│   ├── signup/landlord/
│   └── verify/student/, verify/status/
│
├── landlord/                   # Landlord portal — LandlordLayout (sidebar shell)
│   ├── dashboard/
│   ├── properties/
│   ├── property/new/            # 3-step property creation wizard
│   ├── property/[id]/rooms/     # Room management per property (block tabs)
│   ├── room/new/                # Room creation form (photos, amenities, lease options)
│   ├── bookings/                # Incoming booking requests
│   ├── payments/                # Revenue + payout tracker
│   ├── lease-config/            # Platform-wide lease duration defaults
│   ├── kyc/                     # KYC document submission
│   ├── verify/status/           # KYC review status
│   └── profile/                 # Business info, payout bank account, KYC docs, notifications
│
├── components/                 # Shared across groups: Navbar, Footer, AuthLayout
├── lib/
│   └── data.js                  # PROPERTIES mock data + all getX() helpers
├── layout.js                    # Root layout, global metadata
├── globals.css
├── sitemap.js
├── robots.js
├── not-found.jsx
└── error.jsx                    # Global error boundary
```

Each route group has its own `loading.jsx` / `error.jsx` where it makes sense (e.g. `search/loading.jsx`, `landlord/bookings/loading.jsx`, `(student)/booking/error.jsx`, `landlord/error.jsx`), giving route-scoped skeletons and recovery UI instead of one global spinner everywhere.

---

## Route Map

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Homepage |
| `/search` | Public | Property search & filters |
| `/property/[id]` | Public | Property detail, block/room selector |
| `/rooms/[id]` | Public | Room detail + booking entry point |
| `/about`, `/faq`, `/contact` | Public | Trust content, help, support form |
| `/login` | Auth | Student/landlord login toggle |
| `/signup/student`, `/signup/landlord` | Auth | Registration |
| `/verify/student`, `/verify/status` | Auth | Student KYC + status |
| `/dashboard` | Student | Student home |
| `/booking/confirm`, `/booking/pay`, `/booking/success` | Student | Checkout flow |
| `/booking` | Student | My Bookings list |
| `/saved` | Student | Saved rooms |
| `/profile` | Student | Account settings |
| `/landlord/dashboard` | Landlord | Landlord home |
| `/landlord/properties` | Landlord | Property list |
| `/landlord/property/new` | Landlord | Create property (3-step) |
| `/landlord/property/[id]/rooms` | Landlord | Manage rooms per property |
| `/landlord/room/new` | Landlord | Create room |
| `/landlord/bookings` | Landlord | Incoming bookings |
| `/landlord/payments` | Landlord | Revenue & payouts |
| `/landlord/lease-config` | Landlord | Platform-wide lease settings |
| `/landlord/kyc`, `/landlord/verify/status` | Landlord | KYC submission + status |
| `/landlord/profile` | Landlord | Business/payout/notification settings |

`robots.js` disallows crawling of all authenticated areas (`/dashboard`, `/booking`, `/saved`, `/profile`, `/landlord`, `/login`, `/signup`, `/verify`). `sitemap.js` indexes only public marketing pages plus every real property and room pulled from `PROPERTIES`.

---

## Data Layer

Everything currently reads from **`app/lib/data.js`**, which exports:

- `PROPERTIES` — the full mock dataset: properties → blocks → rooms, each room with images, amenities (grouped by power/water/internet/security/extras), price, and status (`Available` / `Booked` / `Maintenance`)
- `getPropertyById(id)`
- `getRoomById(roomId)` — searches across all properties, returns `{ room, block, property }`
- `getRoomImages(roomId)`
- `getAllAvailableRooms()`
- `getPropertySummaries()` — derives `availableRooms`, `roomTypes`, `priceFrom`/`priceTo`, and a card thumbnail per property (used by homepage, search, sitemap)
- `SERVICE_FEE_RATE` — currently `0.07` (7%), applied consistently across booking, payment, and success pages

Everything else (bookings, payments, notifications, dashboard stats) is still hardcoded as local mock arrays inside individual pages (e.g. `RECENT_BOOKINGS` in the landlord dashboard, `BOOKINGS` in the student bookings page). When wiring up a real backend, `data.js` is the natural place to swap mock functions for real fetches, but the per-page mock arrays will also need to move.

---

## Core Flows

**Booking (student)**
1. `/rooms/[id]` → pick lease duration → `Book This Room`
2. `/booking/confirm` — pick move-in date, agree to terms, see price breakdown (`BookingProgress` step 0)
3. `/booking/pay` — choose card / bank transfer / USSD, pay (step 1)
4. `/booking/success` — booking reference, landlord contact reveal, 48-hour escrow notice (step 2)

**KYC (landlord)**
1. `/signup/landlord` → `/landlord/kyc` (upload gov ID, property doc, geo-tagged photos, NIN/BVN)
2. `/landlord/verify/status` — pending / approved / rejected states (currently toggled via a `STATUS` constant for design preview purposes)
3. On approval → `/landlord/dashboard` → create property → add rooms

**Room management**
`/landlord/properties` → `/landlord/property/[id]/rooms` (block-tabbed room grid, status toggle, edit/view actions) → `/landlord/room/new` (min. 5 photos enforced, per-category amenities, lease option overrides).

---

## Design System Notes

- Primary brand color: **orange-500** (`#f97316`-family), used consistently for CTAs, active states, and highlights
- Rounded, card-based UI throughout (`rounded-xl` / `rounded-2xl`), soft shadows, `border-gray-100` hairlines
- Status colors are consistent app-wide: green = Available/Confirmed/Verified, red = Booked/Cancelled, gray = Maintenance/Expired, amber = Pending
- Mobile-first responsive patterns:
  - `Footer.jsx` renders three completely different layouts by breakpoint: fixed bottom app-nav on mobile, single-row footer on tablet, full 4-column footer on desktop
  - `PropertyBookingPanel.jsx` uses a sticky sidebar on desktop but a slide-up bottom sheet + summary bar on mobile for room selection
  - Carousels (`FeaturedCarousel`, `RoomImageCarousel`) use native scroll-snap on mobile and a CSS grid on desktop rather than a JS carousel library

---

## Accessibility

Notable patterns already implemented, worth preserving as the app grows:
- Focus traps + Escape-to-close on all modal/drawer/sheet components (`LandlordLayout` mobile drawer, `ImageGalleryModal`, `MobileSheet` in `PropertyBookingPanel`)
- `aria-live="polite"` regions announcing carousel/room-selection state changes for screen readers without spamming intermediate animation frames
- `useReducedMotion()` respected throughout all Framer Motion usage, plus a global CSS fallback in `globals.css` for `prefers-reduced-motion`
- `aria-expanded` / `aria-controls` on all accordion and expandable-row components (FAQ, bookings list, landlord booking rows)
- Minimum 44px touch targets on mobile interactive elements (expand/collapse buttons, close buttons)

---

## SEO

- Per-page `generateMetadata()` on dynamic property and room pages (title, description, canonical URL, Open Graph, Twitter card)
- Root-level default metadata + templated titles in `app/layout.js`
- Dynamic `sitemap.js` built from live `PROPERTIES` data (not hardcoded)
- `robots.js` blocks all authenticated/private routes from indexing

---

## Getting Started

```bash
# install dependencies
npm install

# run the dev server
npm run dev

# open http://localhost:3000
```

No environment variables are required to run the app as-is, since there is no live backend, payment provider, or auth service connected yet — everything runs on the mock data in `app/lib/data.js` and simulated `setTimeout` "API calls."
