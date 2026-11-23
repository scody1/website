# Rajeshwar Pooja Samagri — E-commerce Store

A complete online store for pooja essentials and brassware, with an admin panel, Postgres database, Shiprocket shipping, and payments by Cash on Delivery, Razorpay or manual UPI.

**Stack:** Next.js 14 (App Router) · TypeScript (strict) · Tailwind CSS · PostgreSQL (Supabase or any Postgres 14+) · Zod validation.

---

## How it works

```
Browser (storefront / admin UI)
        │  only talks to our own API routes
        ▼
Next.js server (app/api/*)  ──►  PostgreSQL (orders, products, stock, settings…)
        │                    ──►  Shiprocket API  (server-side credentials only)
        │                    ──►  Razorpay API    (server-side secret only)
        ◄── webhooks: /api/webhooks/razorpay, /api/webhooks/tracking
```

* **The browser never touches the database.** All reads and writes go through server routes. Tables have row-level security turned on with no public policies, so Supabase's public "anon" key can't read or change anything.
* **Prices, stock and coupons are re-checked on the server** inside one database transaction when an order is placed. Stock can't go negative, and coupons can't be used past their limits.
* **Order numbers** (`RPS-100001` and up) come from a database sequence, so they never collide.
* Every change to an order (status, payment, shipping, warnings) is written to an **order history** that the admin can see.

### Customer side
* **Product pages** at `/product/<name>`. Each has its own URL, title and description, Google product data (price, stock, reviews) and a share image. The site also has `/sitemap.xml` and `/robots.txt` (admin and API excluded).
* **Google Analytics 4:** page views, product views and a **purchase** event with the order value. Set the GA4 ID in SEO & Policies.
* Policies: Privacy, Terms, Return & Refund, and a separate **Shipping Policy**, all editable in the admin.
* Products, categories, approved reviews and store settings come from the database. Pages are rendered on the server, so search engines see real content, plus SEO meta tags, JSON-LD and optional GA4.
* Cart is saved in the browser. Coupons are validated by the server.
* Checkout always shows the **server-calculated total**. Payment options:
  * **Cash on Delivery**: optional COD fee and an optional maximum order value for COD.
  * **Razorpay**: real Razorpay Checkout, with the signature verified on the server and the payment double-checked with Razorpay. A webhook also confirms payments if the customer closes the browser early. Unpaid orders are cancelled after 30 minutes and their stock is returned.
  * **Manual UPI QR**: the QR shows the exact amount, the customer enters their UTR, and the admin verifies it before shipping. The same UTR can't be used twice.
* **Order tracking** with the order number + phone, or with the courier **AWB number** alone. It shows the live Shiprocket/Delhivery scan history and expected delivery date (refreshed from the courier at most every 15 minutes and by the tracking webhook). AWB tracking shows no name, address, phone or amount.
* **Customer accounts** (mobile number + password): order history, cancel before dispatch, return requests after delivery, a saved wishlist and saved address. Phone numbers are not OTP-verified, so past guest orders are never linked automatically; a customer adds one with its order number **and** delivery pincode. Passwords need 8+ characters with letters and numbers, and logins are rate-limited.
* **Cancellation refunds automatically.** When the customer or the admin cancels a Razorpay-paid order, the remaining amount is refunded through Razorpay at once and any courier shipment is cancelled. UPI/manual payments are marked **refund due** and appear in the admin alerts until you record the refund.
* Reviews are held until the admin approves them. A review is marked "Verified buyer" only when the order number and phone match a delivered order.
* **Pincode & COD eligibility come live from Shiprocket** (all courier partners, prepaid and COD) when connected, else from Delhivery, else a clearly-labelled estimate. Checkout uses the same check: orders to unserviceable pincodes are refused, and COD is switched off where no courier offers it.

### Admin panel (`/admin`)
* **Refunds & returns:** header badges and dashboard tiles show **refunds due** (cancelled, paid, not yet refunded) and **open return requests**; the Orders list filters by both. In an order, approve / reject / complete a customer's return request, and cancelling shows whether the money went back through Razorpay automatically or must be paid back by hand. A refund lock stops two people refunding the same order at once, and the amount already refunded is re-checked with Razorpay first.
* **Personal accounts with roles.** Everyone signs in with their own email and password. Passwords are hashed with scrypt. Sessions are stored server-side in an HttpOnly, SameSite=Strict cookie. 5 wrong attempts lock sign-in for 15 minutes. Cross-site requests are blocked.
* **First-time setup:** on a fresh install, `/admin` asks for `ADMIN_SETUP_KEY` and creates the first **Super Admin**. That screen never appears again.
* **Dynamic roles (module → submodule permissions).** Roles live in the database and are managed in **Users & Roles**. The catalogue has 32 permissions in 9 modules:

  | Module | Permissions |
  |---|---|
  | Orders | view · change status · cancel · notes & courier cost · export |
  | Payments | verify UPI · refunds |
  | Shipping | book/cancel/track shipments · shipping setup |
  | Customers | view · export |
  | Products & Catalogue | view · add · edit · delete · stock · cost prices · categories |
  | Coupons & Reviews | view coupons · manage coupons · view reviews · moderate reviews |
  | Reports | sales & profit |
  | Store Settings | store profile · pickup address/GST/PAN · payment & shipping charges · SEO & policies |
  | Administration | integrations · view users · manage users · manage roles · audit log |

  * Create a role with a name and tick the permissions per module, with "select all" per module. Changes apply to every user with that role on their next click, with no sign-out needed.
  * **Presets:** Super Admin (built-in, always has everything, can't be edited or deleted), Store Manager, Dispatch Staff and Viewer/Accountant. The presets can be edited or deleted like any other role.
  * **No privilege escalation:** someone who isn't a Super Admin can only create or assign roles whose permissions they already have. They can't edit their own role, create a Super Admin, or change a Super Admin account.
  * A role that still has users can't be deleted.
  * Fine-grained rules are enforced on the server:
    * stock-only roles can change quantities but not prices;
    * cost prices are hidden without `products.cost`;
    * each settings section has its own permission;
    * cancelling and refunding need their own permissions.

  New users get a temporary password and must set their own before they can do anything. Deactivating a user or resetting their password signs them out at once. There is always at least one active Super Admin.
* **New-order alerts:** the admin panel checks for new orders every 20 seconds. Press **Order alerts** once and you get a temple-bell sound plus a browser pop-up for each new order (as long as the admin tab is open, even in the background). An optional e-mail alert also goes to the owner.
* **Order e-mails (optional, via Resend):** sent automatically and at most once each:
  * order confirmation to the customer;
  * new-order alert to the owner;
  * "shipped" e-mail with the courier tracking link;
  * delivered, cancelled and refunded notices.

  Customers get e-mails only if they gave an e-mail at checkout. For SMS/WhatsApp tracking messages, turn on customer notifications in the Shiprocket panel.
* **Refunds:** from the order page, full or partial. Razorpay payments are refunded through the Razorpay API, so the money goes back automatically. COD and UPI refunds are paid back by the store and recorded with the reference.
* **Delhivery (direct, optional):** book with the store's own Delhivery account: waybill, pickup request at the registered warehouse, label PDF, tracking sync and cancellation. Shiprocket can also ship via Delhivery without this.
* **Integrations (Super Admin):** connect **Shiprocket** (API user email + password) and **Razorpay** (key ID, key secret, webhook secret) once in the admin panel. They are checked with Shiprocket/Razorpay before saving, stored **AES-256 encrypted** (key from `APP_SECRET`), and never shown again or sent to any browser. The screen also shows the webhook URLs and the Shiprocket webhook token to copy.
* **Audit log:** sign-ins (including failed ones), user changes, settings changes, exports and integration changes, with who and when. Order history records which admin made each change.
* **Setup & Overview**: go-live checklist and alerts (new orders, UPI to verify, low stock, reviews to approve).
* **Orders**: search and filter, payment verification, status changes (only valid moves are allowed, and cancelling or an RTO returns stock), notes, actual courier cost, printable invoice (GST tax invoice with CGST/SGST or IGST, or a bill of supply), CSV export.
* **Shiprocket booking from the order page**: compare courier rates, then book. The app creates the Shiprocket order (with real product weights and the correct COD amount), assigns the AWB, schedules pickup and fetches the label PDF. Each step is saved, so a failed step can be retried without duplicates. **Fake tracking numbers are never created.** A manually booked shipment from another courier can be recorded too.
* **Products & Stock**: add, edit, archive products and categories; photos are compressed in the browser and stored in the database; inline stock editing.
* **Shiprocket**: connection test, picking the pickup location, webhook instructions.
* **Customers**, **Sales & Profit** (revenue, cost of goods, real courier cost, COD pending or collected, top products, low stock), **Payments & Coupons** (dates, usage limits, maximum discount), **Store & Pickup**, **SEO & Policies**, **Reviews** moderation.

---

## 1. Local setup

Requirements: Node.js 20+.

```bash
npm install
cp .env.example .env.local      # then edit .env.local
```

### Database
Use either:

**A. Supabase (recommended):** create a project, copy the *Transaction pooler* connection string into `DATABASE_URL`.

**B. Throw-away local database (no install):**
```bash
npm run db:local                # keeps running; data stored in ./.localdb
```
then in `.env.local`:
```
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres
DB_POOL_MAX=1
```
(The local database is single-process PGlite: for development only, never production.)

### Create tables and starter catalogue
```bash
npm run db:migrate              # creates/updates tables (safe to re-run)
npm run db:seed                 # adds sample categories, products and coupons (safe to re-run)
npm run dev                     # http://localhost:3000  — admin at /admin
```
Open `/admin`, enter `ADMIN_SETUP_KEY` and create your Super Admin account. Then go to **Integrations** to connect Shiprocket and Razorpay.

Other checks: `npm run typecheck`, `npm run build`.

---

## 2. Deploying to production (Vercel + Supabase)

1. Push the project to a private Git repository and import it into Vercel.
2. In Vercel → Settings → Environment Variables add: `DATABASE_URL`, `APP_SECRET`, `ADMIN_SETUP_KEY`, `SITE_URL`, `CRON_SECRET` (see `.env.example`).
3. Run the migrations against the production database once, from your computer:
   ```bash
   DATABASE_URL="<production url>" npm run db:migrate
   DATABASE_URL="<production url>" npm run db:seed      # optional starter catalogue
   ```
4. Deploy. Open `/admin`, create the Super Admin with `ADMIN_SETUP_KEY`, then work through the **Go-live checklist**. Add staff accounts in **Users & Roles**.
5. **Shiprocket** (Super Admin)
   * In Shiprocket → Settings → API → API Users, create an API user (its email must differ from the main login).
   * In Admin → **Integrations**, enter that email and password and press **Verify & connect**.
   * Add and verify your pickup address in Shiprocket. Then in Admin → **Shipping Setup**, press **Test connection** and choose it.
   * Copy the webhook URL and token from Integrations into Shiprocket → Settings → API → Webhooks.
   * Keep the Shiprocket wallet topped up. AWB assignment fails without balance, and the app shows that error.
   * **Delhivery direct (optional):** in Integrations, enter the API token from Delhivery One → Settings → API Setup (choose Staging for a test account). Then in **Shipping Setup**, enter the warehouse name exactly as registered with Delhivery.
   * **E-mails (recommended):** create a free Resend account and verify your domain. Then, in Integrations → Order e-mails, enter the API key, the from-address (e.g. `Store <orders@your-domain.in>`) and the owner's alert e-mail. A test e-mail is sent when you connect.
6. **Razorpay** (Super Admin, if used)
   * In Admin → **Integrations**, enter the **live** key ID, key secret and a webhook secret you choose. Then enable Razorpay in Payments & Coupons.
   * In Razorpay Dashboard → Webhooks, add the URL shown in Integrations, with the events `payment.captured`, `payment.failed` and `order.paid` and the same webhook secret.
7. **Scheduled job**: `vercel.json` runs `/api/cron` once a day (the Vercel Hobby plan limit). For prompt expiry of unpaid orders and tracking refresh, call it every 15–30 minutes. Use Vercel Pro, or a free scheduler such as cron-job.org, with the header `Authorization: Bearer <CRON_SECRET>`. Unpaid orders are also cleaned up automatically whenever a new order is placed or the admin opens Orders.

### Upgrading an existing install
Run `npm run db:migrate`. Migrations `005` and `006` add customer accounts, the wishlist, return requests, stored courier tracking and the refund lock (with row level security on every new table). Migration `004` moves roles into the database (existing users keep their role). Migration `003` adds product page URLs, refunds and e-mail tracking. Migration `002_users_roles.sql` adds user accounts, which signs out old password-only sessions. Set `APP_SECRET` and `ADMIN_SETUP_KEY`, then open `/admin` to create the Super Admin. Credentials in `SHIPROCKET_*` / `RAZORPAY_*` environment variables keep working and override the Integrations screen.

### "Database not connected" — troubleshooting
Open `/api/health` or the store page: it now says exactly what is wrong (no password is shown). On your computer run `npm run db:check` with the same `DATABASE_URL`. Common causes:
* **Migrations not run** on the production database → `npm run db:migrate` (it applies only the missing files).
* **Wrong or un-encoded password**: special characters in the password must be URL-encoded (`@` → `%40`, `#` → `%23`, `/` → `%2F`).
* **Supabase project paused** (free plan, after 7 days idle) → Restore it in the Supabase dashboard.
* **Wrong pooler user/host**: the Transaction pooler user is `postgres.<project-ref>`; copy the string from Supabase → Connect. Use port 6543 on Vercel.
* **Region**: create the Supabase project in **Mumbai (ap-south-1)**, next to the Vercel `bom1` region; a far-away database makes every page slow.

### Moving from the old prototype
The old version kept the whole store, including customer data and courier passwords, in a **publicly writable** `store_settings` row. Migration `001_init.sql` locks that table down. After you have copied anything you need from it, delete it in Supabase. Also **change the Shiprocket password** if it was ever entered into the old admin panel, because it was readable by anyone.

---

## 3. Before handing over to the client

* Create the client's Super Admin account (or let them do it with `ADMIN_SETUP_KEY`) and give them any keys privately. Keep `APP_SECRET` safe and unchanged.
* Replace the sample products and photos, and review all marketing claims on the homepage (e.g. "100% solid brass", "#1 bestseller", "India's largest"). The store owner is legally responsible for them.
* Have the privacy, terms and refund policies reviewed for the business (Admin → SEO & Policies).
* Do a real ₹1–2 test order with live Razorpay keys, then cancel it to see the automatic refund, and one real Shiprocket booking (then cancel it from the order page) before announcing the store.
* Back-ups: Supabase takes daily backups on paid plans. On the free plan, export regularly (Admin → Orders → CSV, or `pg_dump`).

---

## Project layout

```
app/
  page.tsx                 storefront (server-rendered from the DB)
  admin/page.tsx           admin (login or dashboard)
  api/                     public APIs, admin APIs (api/admin/*), webhooks, cron
components/                storefront components
components/admin/          admin panel
lib/server/                db, auth, settings, catalog, orders, shipping, Shiprocket, Razorpay
lib/shared/                types, pricing, order statuses, GST, formatting (used by both sides)
db/migrations/             SQL migrations
db/seed-data.json          starter catalogue
scripts/                   migrate, seed, local database
```
