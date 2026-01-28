# Bisogo Headless Travel + eCommerce (Next.js + WordPress/WooCommerce)

A production-ready headless app:
- **Frontend**: Next.js App Router + TypeScript + Tailwind + shadcn/ui style primitives
- **CMS/Commerce**: WordPress + WooCommerce on `cms.bisogo.ph`
- **Content**: WPGraphQL (`/graphql`) for posts/pages
- **Products**: WPGraphQL WooCommerce **if available**, otherwise **WooCommerce REST fallback**
- **Cart**: frontend-only (zustand + localStorage), no Woo cookies/sessions
- **Checkout**: server creates Woo order → redirects to Woo payment/checkout URL
- **Auth**: Auth.js / NextAuth (Google + Facebook) with **DB sessions** via Drizzle

---

## Prerequisites

- Node.js **18+** (recommended 20+)
- pnpm / npm / yarn (examples below use **pnpm**)
- Docker (recommended) for local Postgres
- WordPress site with:
  - **WPGraphQL** installed and enabled
  - (Optional) **WPGraphQL WooCommerce** for product GraphQL

---

## Setup (Local)

1) Install dependencies

```bash
pnpm install
```

2) Configure environment

```bash
cp .env.example .env.local
```

Update values in `.env.local` (Woo keys, OAuth, etc).

3) Start local Postgres

```bash
docker compose up -d
```

4) Generate + run DB migrations (Drizzle)

```bash
pnpm db:generate
pnpm db:migrate
```

5) Run dev server

```bash
pnpm dev
```

App runs on `http://localhost:3000`

---

## Core Routes

- `GET /` Home (featured posts + products)
- `GET /blog` Blog index (search, category/tag filter, pagination)
- `GET /blog/[slug]` Blog article (TOC, reading time, related posts, JSON-LD Article)
- `GET /shop` Shop (search, category filter, sort)
- `GET /product/[slug]` Product page (gallery, attributes/variants where available, add to cart, JSON-LD Product)
- `GET /p/[slug]` WordPress pages (About/Contact/etc)
- `GET /cart` Frontend cart
- `GET /account` Auth test page (Google/Facebook login)

---

## Checkout Redirect Flow

1) User clicks **Checkout** on `/cart`.
2) Frontend calls:

`POST /api/checkout/create-order`

Body includes cart line items + optional customer info.
3) Server-side creates a WooCommerce **Order** via REST:

- Uses `WOO_REST_URL`, `WOO_CONSUMER_KEY`, `WOO_CONSUMER_SECRET`
- Populates `line_items` using the cart’s `productId` and optional `variationId`
4) API responds with:

```json
{ "redirectUrl": "https://cms.bisogo.ph/checkout/order-pay/..." }
```

5) Frontend redirects the browser to `redirectUrl` to complete payment in Woo.

---

## Smart Caching / Revalidation

- Content and products are fetched with Next.js caching (`revalidate` + `tags`)
- Revalidate endpoint:

`POST /api/revalidate?token=REVALIDATE_TOKEN`

Body examples:
```json
{ "tag": "posts" }
```

```json
{ "path": "/blog" }
```

---

## WordPress/Woo Configuration Notes

### WPGraphQL
Ensure `WP_GRAPHQL_ENDPOINT` points to:
- `https://cms.bisogo.ph/graphql`

### WooCommerce REST API keys
Create keys in Woo admin:
**WooCommerce → Settings → Advanced → REST API**

Use in `.env.local`:
- `WOO_CONSUMER_KEY`
- `WOO_CONSUMER_SECRET`

### WPGraphQL WooCommerce (optional but preferred)
If installed, the app will use it automatically.  
If not available, the app falls back to Woo REST for product reads.

---

## Vercel Deployment Notes

1) Push this repo to GitHub.
2) Import into Vercel.
3) Set environment variables in Vercel:
- All values from `.env.example`
- Use **Neon Postgres** for `DATABASE_URL`

4) Set `NEXTAUTH_URL` to your production domain:
- `https://bisogo.ph`

5) Deploy.

---

## Drizzle vs Prisma (Recommendation)

This project uses **Drizzle** (required). If you ever consider Prisma:

**Drizzle Pros**
- Very lightweight, fast, SQL-first
- Great for serverless/edge + Postgres
- Migrations are straightforward and transparent

**Prisma Pros**
- Richer schema modeling / relations tooling
- Powerful type-safe client + ecosystem
- Great for complex domain models and rapid iteration

**When to switch**
- If you need heavy relational querying, complex nested writes, or prefer Prisma’s schema workflow.
- Keep Drizzle if you want minimal overhead and SQL-centric control.

---

## Scripts

- `pnpm dev` start dev server
- `pnpm build` build for production
- `pnpm start` run production server
- `pnpm lint` lint
- `pnpm db:generate` generate Drizzle migrations
- `pnpm db:migrate` run migrations
- `pnpm db:studio` Drizzle Studio

