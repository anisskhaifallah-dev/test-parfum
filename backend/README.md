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

The schema avoids SQLite-only quirks (no enums, no native arrays), so the move to
Postgres is a config change, not a rewrite:

1. Add a Postgres plugin to the Railway project and copy its `DATABASE_URL`.
2. In `prisma/schema.prisma`, change the datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (the deployed frontend origin), and
   `ADMIN_EMAIL`/`ADMIN_PASSWORD` as Railway environment variables.
4. Build/start commands for the Railway service: `npm run build` then `npm start` —
   `start` already runs `prisma migrate deploy` before launching the server, and
   `postinstall` runs `prisma generate`, so no custom Railway start command is needed.
5. Run `npm run seed` once against the Railway database (or via a Railway one-off command)
   to load the catalog and create the first admin account.
6. **Uploaded images (`/uploads`)**: Railway's filesystem is ephemeral by default — files
   written to `uploads/` disappear on every redeploy/restart. Attach a
   [Railway volume](https://docs.railway.com/guides/volumes) mounted at the backend's
   `uploads` directory before staff start uploading real product photos, or images will
   randomly vanish.

## Scaling this project

Nothing below needs doing now — it's here so "how do we scale this" has an answer once
the store outgrows what it runs on today. Roughly the order you'd hit these in:

1. **Analytics aggregation (`/api/analytics`)** — currently fetches every order (+ items)
   in the selected date range and aggregates in JavaScript. That's simple and fast at
   today's order volume, but doesn't scale past a few thousand orders per range. Replace
   it with indexed SQL `GROUP BY` aggregate queries, or a scheduled daily rollup table,
   instead of loading every matching row per request.
2. **SQLite → Postgres** — covered above. SQLite also doesn't handle concurrent writers
   well, so this is the same point where running more than one backend instance becomes
   possible at all.
3. **Uploaded images on local disk** — fine for one instance with a Railway volume
   attached (see above). If you outgrow a single instance, or want a CDN in front of
   product photos, move to object storage (S3, Cloudinary, Railway bucket storage) and
   keep storing the returned URL exactly like `image` is stored today — it's already just
   a URL string, no schema change needed.
4. **Single Express instance** — once on Postgres, this scales horizontally (multiple
   instances behind a load balancer) since nothing here holds in-memory state between
   requests other than the `JWT_SECRET`, which is already a shared env var.
5. **No caching** — `GET /products` / `GET /packs` rarely change; if storefront traffic
   grows, cache those responses for a short TTL (or invalidate on write) instead of
   hitting the database on every page load.

## Known follow-up

The frontend's checkout, catalog pages, and hidden `/staff.html` dashboard are all wired
to this API already (product CRUD, image upload, and order management all work end to
end). Still open: no UI yet for the admin-only `POST /auth/staff` (creating more staff
accounts) - that one's API-only for now.
