# Shikkis — Project Rules for Agents

## Product
Shikkis is an Indian & fusion wear e-commerce store for men and women.
Tagline: "Curated Style". Single physical store + online storefront.
Currency: INR. Locale: en-IN. All money stored as INTEGER PAISE, never floats.

## Non-negotiable stack
- Backend: Node.js + Express + TypeScript (strict mode on)
- Frontend: React 18 + TypeScript + Vite
- Database: SQLite via better-sqlite3, WAL mode, foreign keys ON
- Styling: Tailwind CSS with CSS custom properties for theming
- Animation: Framer Motion
- State: Zustand
- Routing: React Router v6
- Validation: Zod on EVERY API boundary, shared schemas between client and server
- Auth: JWT access (15m) + refresh (7d), bcryptjs for hashing
- Payments: Razorpay

Do not introduce additional UI libraries, CSS frameworks, ORMs, or state
libraries. If you believe one is necessary, stop and ask in the plan instead
of installing it.

## Two roles — this shapes everything
- `owner` — exactly one account. Full admin. Manages products, offers,
  banners, orders, customers, reports.
- `customer` — many accounts. Browses, carts, orders, tracks.

Rules:
- Every `/api/admin/*` route passes through `requireRole('owner')` middleware.
  No exceptions, no route added without it.
- Role is read from the verified JWT claim server-side only. Never from a
  request body, query param, header, or client-sent field.
- The frontend hiding an admin button is a convenience, not a security
  control. Assume the client is hostile.
- A customer can only read/write rows where `user_id` matches their own token
  subject. Every customer-scoped query must filter on it — orders, addresses,
  carts, profile.
- Registration always creates role `customer`. The owner account exists only
  via the seed script. There is no self-service path to becoming owner.
- Write a test for each of these: customer hitting an admin route gets 403,
  customer requesting another customer's order gets 404 (not 403 — do not leak
  existence).

## Design system — use these tokens, never raw hex in components
Define once in `src/styles/tokens.css` as CSS custom properties, consume
everywhere through Tailwind config. Dark mode flips the same variable names
under `[data-theme="dark"]`, so no component needs a dark-mode branch.

Brand (identical in both themes):
  --brand-crimson: #9B1B30
  --brand-gold:    #D4AF37

Light theme:
  --bg:            #FEFBF8
  --surface:       #FFFFFF
  --surface-alt:   #F5E6D3
  --text:          #2C1810
  --text-muted:    #7A6A5F
  --border:        #E8D4A0

Dark theme:
  --bg:            #1A0F0A
  --surface:       #241611
  --surface-alt:   #2C1810
  --text:          #F5E6D3
  --text-muted:    #A8998C
  --border:        #4A2F25

Semantic (both themes):
  --success: #2D6A4F
  --warning: #F4A261
  --danger:  #E76F51

Type:
  Headings — 'Cormorant Garamond', serif. Body — 'Inter', sans-serif.
  Self-host both via @fontsource. No Google Fonts network request.
  Scale: 12 / 14 / 16 / 18 / 20 / 24 / 28 / 36 / 48 px.

Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 px. Nothing off-scale.
Radius: 4 / 8 / 12 / 9999px. Shadows: 4 levels, sm through xl.

## Theming rules
- Theme stored in localStorage key `shikkis-theme`, values `light` | `dark` |
  `system`. Default `system` .
- Applied by setting `data-theme` on `<html>`.
- An inline blocking script in `index.html` sets `data-theme` BEFORE first
  paint. A flash of the wrong theme is a bug, not a nitpick.
- Both themes must pass WCAG AA contrast. Crimson on the dark background fails
  — on dark, gold is the primary accent and crimson is reserved for filled
  surfaces with light text. Verify with a contrast check, do not eyeball it.
- Every page, modal, drawer, toast, chart, empty state, skeleton and error page
  works in both themes. Screenshot both when verifying.

## Animation rules
Use Framer Motion. Animate `transform` and `opacity` only — never `width`,
`height`, `top`, `left`, or `box-shadow` on a per-frame basis.

Durations: micro-interactions 150ms, standard transitions 200ms, entrances
300ms. Easing `[0.4, 0, 0.2, 1]`. Nothing over 400ms anywhere.

Required motion, and nothing beyond this without asking:
- Page transitions: fade + 8px rise, 200ms
- Product grid: staggered entrance, 40ms per item, capped at 8 items of stagger
- Product card hover: image scales to 1.04, 200ms
- Cart drawer: slides from right, spring, plus backdrop fade
- Add-to-cart: cart badge count scales 1 → 1.2 → 1, 300ms
- Modals: scale 0.96 → 1 with backdrop fade
- Toasts: slide in from top-right, auto-dismiss 4s
- Skeletons while loading — never a centered spinner for content areas
- Offer/festival banner: a slow gold shimmer sweep, 3s loop
- Order status timeline: each completed step fills in sequence on mount
- Accordion/collapse: height auto via Framer's layout animation

Accessibility: wrap everything in a `useReducedMotion()` check. When the user
prefers reduced motion, all of the above become instant opacity changes with
no transform. This is mandatory, not optional.

## Responsive rules
Mobile-first. Breakpoints: 640 / 768 / 1024 / 1280.
- Product grid: 1 col < 640, 2 cols 640–1024, 3 cols 1024–1280, 4 cols above
- Navigation: hamburger + slide-in menu below 768, full horizontal nav above
- Filters: bottom sheet below 768, persistent left sidebar above
- Admin tables: horizontally scrollable card-per-row below 1024, real table above
- Cart drawer: full-screen below 640, 420px panel above
- Touch targets minimum 44×44px
- No horizontal page scroll at any width from 320px up. Test at 320px.

## Performance budget
- LCP under 2.0s on simulated 4G
- Route-level code splitting; admin bundle never ships to customer routes
- Framer Motion lazy-loaded on routes that use it
- Images: AVIF/WebP with fallback, correct `sizes`, `loading="lazy"` below fold,
  explicit width/height to prevent layout shift
- Lighthouse: Performance ≥ 90, Accessibility ≥ 95

## Security baseline
- helmet, CORS locked to known origins, rate limits on auth/coupon/OTP routes
- Razorpay webhook signature verified server-side; order marked paid ONLY from
  the verified webhook, never from the client success callback
- Idempotency key on order creation
- All prices and discounts computed server-side. The client sends product IDs
  and quantities — never prices.
- No secrets in any `VITE_` variable
- Parameterised queries only

## Working style
- Before writing code, produce an Implementation Plan artifact and wait for
  approval.
- After implementing, launch the dev server, drive the browser, and produce a
  walkthrough artifact with screenshots at 375px, 768px and 1440px in BOTH
  light and dark mode. A task is not done until those screenshots exist.
- Run `tsc --noEmit` and the test suite before declaring done.
- Small commits with conventional commit messages.
- If a requirement here conflicts with something I ask in a task prompt, flag
  the conflict in the plan rather than silently picking one.
