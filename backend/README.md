# YY Parfums — Backend

Node.js + Express + Prisma, backed by Postgres (same provider locally and on Railway —
see below).

## How ordering actually works here

There are no customer accounts. A customer fills out a checkout form (name, phone,
address, notes) and submits their cart — that creates an `Order` with status `pending`.
Customer service reviews pending orders and confirms them (by phone/DM, since payment is
Cash on Delivery — there's no payment step to automate). Only staff (admin or customer
service agents) log in, and that login is never linked from the public site — it's at
`/staff.html` on the frontend, reachable only if you know the URL.

Prices are stored as plain whole numbers and displayed by the frontend as Moroccan
Dirham (DH) — the backend itself is currency-agnostic, it just stores integers.

## Local setup

```
cd backend
npm install
npx prisma migrate dev   # applies the schema to your local Postgres DB
npm run seed              # loads the 4 products + 3 packs, plus one admin account
npm run dev               # http://localhost:4000
```

Set `DATABASE_URL` in `.env` to a local Postgres instance (e.g. `docker run -e
POSTGRES_PASSWORD=postgres -p 5432:5432 postgres` and
`postgresql://postgres:postgres@localhost:5432/postgres`) before running the above.

`.env` is already created from `.env.example`. The seed script creates the first staff
login from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (defaults: `admin@yyparfums.com` /
`changeme123`) — change the password after logging in once.

## API

All routes are prefixed `/api`.

**Public (no auth) — this is what the storefront calls:**
- `GET /products`, `GET /products/:id`, `GET /packs`
- `POST /orders` — guest checkout. Body: `{ fullName, phone, line1, line2?, city, country, notes?, items: [{ kind: 'product'|'pack', productId?, packId?, ml?, qty }] }`. Prices are looked up server-side, never trusted from the client. Returns the created order with status `"pending"`.
- `POST /newsletter` — `{ email }`

**Staff-only (`Authorization: Bearer <token>`) — for the hidden staff dashboard, not the storefront:**
- `POST /auth/login` — the only way to authenticate; there is no public register endpoint
- `GET /auth/me`
- `POST /auth/staff` — admin-only, provisions another staff account (`role: 'admin' | 'agent'`)
- `POST /products`, `PATCH /products/:id`, `DELETE /products/:id` — full product CRUD. `sizes` is a list, not fixed fields: `[{ ml, price, label? }]` — any number of custom sizes per product, `ml: 0` means Full Bottle, `label` auto-fills (`"10ml Decant"` / `"Full Bottle"`) if omitted. Delete is blocked (409) if the product is used in a pack or in a past order.
- `POST /uploads` — `multipart/form-data` with an `image` field (png/jpeg/webp/gif, 5MB max). Returns `{ url }`, an absolute URL already pointing at this backend — use it directly as a product's `image`. This is how staff set a product photo without touching the codebase or knowing a file path.
- `GET /orders`, `GET /orders/:id` — `?status=pending|confirmed|shipped|delivered|cancelled` filter supported on the list
- `PATCH /orders/:id` — `{ status }`, moves an order through pending → confirmed → shipped → delivered (or cancelled)

## Deploying to Railway (Postgres)

1. Add a **Postgres** plugin to the Railway project (**+ New** → **Database** → **Add
   PostgreSQL**). On the backend service's **Variables** tab, set `DATABASE_URL` via
   **Add Reference** pointing at the Postgres service's `DATABASE_URL` — don't type the
   connection string by hand.
2. Set `JWT_SECRET`, `CORS_ORIGIN` (the deployed frontend origin, **no trailing slash** —
   CORS origin matching is exact), and `ADMIN_EMAIL`/`ADMIN_PASSWORD` as Railway
   environment variables on the backend service.
3. Railway service settings: **Root Directory** must be `backend` (this is a monorepo —
   without this, Railway's builder scans the repo root and can't detect a Node app at
   all). Build command stays default (`npm run build`, and `postinstall` already runs
   `prisma generate`). Set **Pre-Deploy Command** to
   `npx prisma migrate deploy && npm run seed` (runs once per deploy, before traffic
   switches over — applies the schema, loads the catalog, and creates the first admin
   account; both are idempotent, safe to run on every deploy) and leave **Custom Start
   Command** blank so it defaults to `npm start`.
4. **Uploaded images** are stored directly in Postgres (the `Image` table), not on local
   disk, specifically because Railway's filesystem is ephemeral - no volume needed, and
   images survive redeploys/restarts.

## Scaling this project

Nothing below needs doing now — it's here so "how do we scale this" has an answer once
the store outgrows what it runs on today. Roughly the order you'd hit these in:

1. **Analytics aggregation (`/api/analytics`)** — currently fetches every order (+ items)
   in the selected date range and aggregates in JavaScript. That's simple and fast at
   today's order volume, but doesn't scale past a few thousand orders per range. Replace
   it with indexed SQL `GROUP BY` aggregate queries, or a scheduled daily rollup table,
   instead of loading every matching row per request.
2. **Uploaded images in Postgres** — fine at today's catalog size, but every image
   request round-trips through the database and there's no CDN/edge caching. If the
   catalog grows large or traffic gets heavy, move to object storage (S3, Cloudinary,
   Railway bucket storage) - the `image` field on Product/Pack is already just a URL
   string, so this only means changing the upload route, not the schema.
3. **Single Express instance** — this scales horizontally (multiple instances behind a
   load balancer) since nothing here holds in-memory state between requests other than
   the `JWT_SECRET`, which is already a shared env var.
4. **No caching** — `GET /products` / `GET /packs` rarely change; if storefront traffic
   grows, cache those responses for a short TTL (or invalidate on write) instead of
   hitting the database on every page load.

## Known follow-up

The frontend's checkout, catalog pages, and hidden `/staff.html` dashboard are all wired
to this API already (product CRUD, image upload, and order management all work end to
end). Still open: no UI yet for the admin-only `POST /auth/staff` (creating more staff
accounts) - that one's API-only for now.
