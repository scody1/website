# End-to-end tests (170 checks)

Runs the real production build against a throw-away database and mock Shiprocket/Razorpay APIs.

```bash
npm run build
node tests/mock-apis.mjs                                   # terminal 1
# terminal 2 — the app pointed at the test DB and mocks:
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres DB_POOL_MAX=1 \
ADMIN_SETUP_KEY=test-admin-pass-123 APP_SECRET=e2e-app-secret-0123456789abcdefghijklmnop \
SHIPROCKET_API_BASE=http://127.0.0.1:4010/sr RAZORPAY_API_BASE=http://127.0.0.1:4010/rzp \
DELHIVERY_API_BASE=http://127.0.0.1:4010/dl EMAIL_API_BASE=http://127.0.0.1:4010/em SITE_URL=http://127.0.0.1:3100 \
CRON_SECRET=cron-secret-xyz npx next start -p 3100
# terminal 3 (creates and migrates its own fresh database):
E2E_DB_DIR=./.e2edb node tests/e2e.mjs
```

The suite creates the first Super Admin, connects Shiprocket/Razorpay through the admin API, and checks every role. Restart `mock-apis.mjs` and use a new `E2E_DB_DIR` for each run. The mocks reproduce the documented
response shapes of Shiprocket and Razorpay; they do not replace one real test booking and payment.
