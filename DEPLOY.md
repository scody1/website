# Deploy Guide — Rajeshwar Pooja Samagri (step by step)

Ye guide order mein follow karo. Har step ke end mein ✅ check likha hai — wo dikhe tabhi aage badho.
Kuch bhi password / key kisi ke saath chat ya WhatsApp pe share mat karna — sirf Vercel / Admin panel mein khud daalna.

---

## 0. Pehle ye cheezein ready rakho

| Cheez | Kahan se |
|---|---|
| Node.js **20 LTS** apne computer pe | nodejs.org → LTS download |
| GitHub account (private repo ke liye) | github.com |
| Vercel account | vercel.com (GitHub se sign in) |
| Supabase account | supabase.com |
| Shiprocket account + KYC done + wallet recharge | app.shiprocket.in |
| Razorpay account (KYC done, **Live mode** activated) | dashboard.razorpay.com |
| Domain (optional but recommended) | GoDaddy / Hostinger etc. |
| Resend account (order e-mails ke liye, free) | resend.com |

---

## 1. Code ko computer pe ready karo

1. `modified_rajesh.zip` ko extract karo (e.g. `C:\Projects\rajeshwar`).
2. Us folder mein terminal (PowerShell) kholo aur chalao:
   ```powershell
   npm install
   ```
   ✅ check: `node_modules` folder ban gaya, koi red ERROR nahi.

> Zip mein `.env.local`, `node_modules`, `.next` aur local database **jaan-boojh ke nahi** hain (secrets & bhari files). `npm install` se sab wapas aa jata hai.

---

## 2. Database — Supabase

1. supabase.com → **New project**
   * Name: `rajeshwar`
   * **Region: South Asia (Mumbai) `ap-south-1`** ← zaroori (Vercel server bhi Mumbai `bom1` mein hai; door ka region = slow site)
   * Database password: strong password banao, **kahin safe likh lo**.
     Tip: password mein sirf letters + numbers rakho (special characters `@ # / ? %` se URL encode ki problem hoti hai).
2. Project ban jaye to upar **Connect** button → **Transaction pooler** wala URI copy karo. Aisa dikhega:
   ```
   postgresql://postgres.abcdefghijkl:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
   * `[YOUR-PASSWORD]` ki jagah apna DB password daalo (brackets hata ke).
   * Password mein special character hai to encode karo: `@`→`%40`, `#`→`%23`, `/`→`%2F`, `?`→`%3F`, `%`→`%25`.
   * User `postgres.<project-ref>` hi hona chahiye (sirf `postgres` nahi), port **6543**.
3. Project folder mein `.env.local` naam ki file banao (`.env.example` copy karke) aur abhi sirf ye line bharo:
   ```
   DATABASE_URL=postgresql://postgres.abcdefghijkl:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
4. Terminal mein:
   ```powershell
   npm run db:check
   ```
   ✅ check: `✓ Connected` dikhe. (Agar `✗` aaye to wahi line batati hai kya galat hai — password, host, paused project, etc.)
5. Tables banao:
   ```powershell
   npm run db:migrate
   ```
   ✅ check: `Applied 6 migration(s)` (001 se 006 tak).
6. (Optional) Sample products daalne hain to:
   ```powershell
   npm run db:seed
   ```
7. Dobara `npm run db:check` → ✅ `All 6 migrations applied`.

> Free Supabase project 7 din use na ho to **pause** ho jata hai → site pe "Store setup required / Host not found" aayega. Supabase dashboard mein **Restore** dabao. Live store ke liye Supabase Pro ($25/month) lena better hai (daily backup bhi milta hai).

---

## 3. Secrets generate karo

Terminal mein 3 baar chalao, teen alag values milengi:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```
* 1st → `APP_SECRET` (credentials encrypt karta hai — **kabhi mat badalna**, warna Shiprocket/Razorpay dobara daalne padenge)
* 2nd → `ADMIN_SETUP_KEY` (pehla Super Admin banane ke liye, ek baar)
* 3rd → `CRON_SECRET`

Teeno ko kisi safe jagah (password manager) mein save karo.

---

## 4. Code GitHub pe daalo (private)

1. github.com → New repository → naam `rajeshwar` → **Private** → Create.
2. Project folder mein:
   ```powershell
   git init
   git add .
   git commit -m "Rajeshwar store"
   git branch -M main
   git remote add origin https://github.com/<tumhara-username>/rajeshwar.git
   git push -u origin main
   ```
   ✅ check: GitHub pe files dikhein, aur **`.env.local` NAHI dikhni chahiye** (`.gitignore` use rokta hai).

---

## 5. Vercel pe deploy

1. vercel.com → **Add New → Project** → GitHub repo `rajeshwar` import karo.
2. Framework: Next.js (auto). Build settings change mat karo.
3. **Environment Variables** mein ye daalo (Production **aur** Preview dono pe same values):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Step 2 wala pooler URL |
   | `APP_SECRET` | Step 3 ki 1st value |
   | `ADMIN_SETUP_KEY` | Step 3 ki 2nd value |
   | `CRON_SECRET` | Step 3 ki 3rd value |
   | `SITE_URL` | `https://www.tumhara-domain.in` (abhi domain nahi hai to `https://rajeshwar.vercel.app`) — end mein `/` nahi |
   | `DB_POOL_MAX` | `3` |

   Shiprocket / Razorpay keys yahan **mat** daalo — wo admin panel se daalenge (encrypted save hoti hain).
4. **Deploy** dabao.
5. Deploy ke baad browser mein kholo: `https://<tumhari-site>/api/health`
   ✅ check: `{"ok":true,"db":"up",...}`
   Agar `ok:false` aaye to usme `problem` aur `hint` likha hoga — wahi fix karo, phir Vercel → Deployments → **Redeploy**.

> Env variable badalne ke baad hamesha **Redeploy** karna padta hai.

---

## 6. Domain + SSL (HTTPS)

1. Vercel → Project → **Settings → Domains** → `www.tumhara-domain.in` add karo (aur bina www wala bhi, jo redirect karega).
2. Vercel jo DNS records bataye (A record / CNAME) wo apne domain provider (GoDaddy etc.) ke DNS mein daalo.
3. 10–60 min mein SSL apne aap lag jata hai (free).
4. `SITE_URL` ko naye domain pe update karo → Redeploy.
   ✅ check: site `https://` pe khule, lock icon dikhe.

---

## 7. Admin panel setup

1. `https://<site>/admin` kholo → **First-time setup** screen aayegi.
2. `ADMIN_SETUP_KEY` daalo + apna naam, e-mail, strong password (10+ characters) → Super Admin ban jayega. (Ye screen dobara kabhi nahi aayegi.)
3. Dashboard pe **Go-live checklist** dikhega — usko upar se neeche follow karo:
   * **Store Setup:** store name, phone, WhatsApp number, Instagram, address, GSTIN (agar hai).
   * **Payments & Coupons:** COD on/off, COD max value, COD fee, UPI ID (manual UPI QR ke liye), Razorpay on (Step 9 ke baad).
   * **Shipping Setup:** free shipping limit / shipping charges, pickup pincode.
   * **SEO & Policies:** meta title/description, GA4 ID (optional), Privacy, Terms, Refund & Return, Shipping policy — apne business ke hisaab se edit karo.
   * **Products:** sample products delete/edit karo, apni photos, price, MRP, stock, weight (kg) aur size daalo (weight sahi hoga tabhi courier charge sahi lagega).
4. **Users & Roles:** staff ke liye alag accounts banao (Dispatch Staff, Manager, Viewer, ya apna custom role). Super Admin ka password kisi ko mat do.

---

## 8. Shiprocket connect karo

1. Shiprocket → **Settings → Company → Pickup Addresses** → apna pickup address add karo aur phone OTP se **verify** karo. Pickup nickname yaad rakho (e.g. `Home`).
2. Shiprocket → **Settings → API → Configure → Create an API User**
   * E-mail: aapke main login se **alag** e-mail hona chahiye (e.g. `api.rajeshwar@gmail.com`).
   * Password set karo.
3. Site admin → **Integrations → Shiprocket** → wo API user ka e-mail + password → **Verify & connect**.
   ✅ check: "Connected as api…@…"
4. Admin → **Shipping Setup → Test connection** → pickup location list aayegi → apna pickup select karke save.
5. Admin → Integrations mein **Shiprocket webhook URL + token** dikhega → Shiprocket → Settings → API → **Webhooks** mein paste karo (tracking apne aap update hogi).
6. Shiprocket wallet mein balance rakho (₹500+). Balance nahi hoga to AWB assign fail hoga — admin mein Shiprocket ka error dikhega.

**Delhivery direct (optional):** sirf tab jab Delhivery ka seedha contract ho. Integrations → Delhivery → API token, phir Shipping Setup mein warehouse ka exact naam.

---

## 9. Razorpay connect karo

1. Razorpay Dashboard → **Live mode** → Account & Settings → **API Keys** → Generate Live Key → Key ID + Key Secret copy karo.
2. Ek **webhook secret** khud banao (Step 3 wala command se ek aur random value).
3. Site admin → **Integrations → Razorpay** → Key ID, Key Secret, Webhook secret → **Verify & connect**.
   ✅ check: "Connected (rzp_live_…)" aur mode **live**.
4. Razorpay Dashboard → **Webhooks → Add new webhook**
   * URL: admin Integrations screen pe jo dikhaya hai (`https://<site>/api/webhooks/razorpay`)
   * Secret: step 2 wala same secret
   * Events: `payment.captured`, `payment.failed`, `order.paid`
5. Admin → **Payments & Coupons** → Razorpay **Enable** → Save.

Refund: order cancel karte hi (customer ya admin) Razorpay se paisa **apne aap** wapas jata hai (customer ke account mein 5–7 working days). Iske liye Razorpay account mein refund ke liye balance hona chahiye.

---

## 10. Order e-mails (recommended)

1. resend.com → apna domain add karo → jo DNS records de, domain DNS mein daalo → verify.
2. Resend → API Keys → create.
3. Admin → Integrations → **Order e-mails**: API key, From (`Rajeshwar <orders@tumhara-domain.in>`), owner alert e-mail → connect.
   ✅ check: test e-mail inbox mein aaye.

---

## 11. Scheduled job (cron)

`vercel.json` free plan pe din mein **1 baar** `/api/cron` chalata hai (unpaid orders cancel + tracking refresh).
Har 15 minute chahiye to (recommended):
* **cron-job.org** (free) → new job → URL `https://<site>/api/cron` → every 15 minutes → Advanced → Header:
  `Authorization: Bearer <CRON_SECRET>`
* ya Vercel Pro plan.

---

## 12. Go-live se pehle REAL test (zaroori)

Har line karke ✅ lagao:

- [ ] Home page, product page, cart sab khul raha hai mobile + laptop pe.
- [ ] Pincode check: apna pincode → "Live from Shiprocket — N courier partners" dikhe.
- [ ] Customer account: Sign up → logout → login → My Account khule.
- [ ] **₹1–2 ka product** bana ke Razorpay se real order karo → admin mein order "New", payment "Paid".
- [ ] Wahi order **My Account → Cancel** karo → toast "refund sent" → Razorpay dashboard mein refund dikhe.
- [ ] COD order karo → admin → order kholo → **Ship with Shiprocket** → AWB + label + pickup aaye → label print hota hai.
- [ ] **Track Order** page pe AWB number se track karo → courier updates dikhein.
- [ ] Shipment cancel karo (order page se) taaki wallet ka paisa wapas aaye, aur test orders cancel kar do.
- [ ] Order confirmation e-mail customer ko aur new-order alert owner ko aaye.
- [ ] Admin header mein naya order aate hi alert/sound (Order alerts ON karke).
- [ ] Staff user se login karke dekho ki use sirf allowed cheezein dikh rahi hain.

Sab ✅ ho jaye to store live announce kar sakte ho.

---

## 13. Baad mein update kaise karein

* Code change → `git add . && git commit -m "..." && git push` → Vercel apne aap deploy kar dega.
* Naya migration file aaye (`db/migrations/007_...sql`) to deploy se pehle apne computer se: `npm run db:migrate` (same `DATABASE_URL` ke saath).
* Products, prices, stock, coupons, policies — sab admin panel se, code ki zaroorat nahi.

---

## 14. Problem aaye to

| Dikkat | Kya karo |
|---|---|
| Site pe "Store setup required" | Wahi page batata hai kya galat hai. Computer pe `npm run db:check`. Supabase paused ho to Restore. Migration missing ho to `npm run db:migrate`. |
| `/api/health` → `AUTH_FAILED` | DB password galat / encode nahi kiya. Supabase mein reset karo, `DATABASE_URL` update, Redeploy. |
| `Tenant or user not found` | Pooler user `postgres.<project-ref>` hona chahiye; URL Supabase → Connect se dobara copy karo. |
| Integrations: "credentials cannot be unlocked" | `APP_SECRET` badal gaya. Purana wapas lagao, ya credentials ek baar dobara daalo — aur fir kabhi mat badlo. |
| Login hota hai par turant logout | Site `https://` pe kholo (domain/SSL lagne ke baad). |
| Shiprocket booking fail | Error message padho: wallet balance, pickup address verify, ya product weight/size missing. |
| Razorpay option checkout pe nahi dikhta | Integrations mein connected hai? Payments & Coupons mein Razorpay enabled hai? |
| Refund fail | Razorpay account mein refund balance kam hai; admin order mein warning dikhegi — balance daal ke order ke **Refund** panel se dobara karo. |
| Pincode "estimate" dikha raha hai, live nahi | Shiprocket connected nahi hai ya Shipping Setup mein pickup pincode nahi bhara. |

Technical details: `README.md`. Automated tests: `tests/README.md`.
