# SCFMP Backend — Sprint 0, 1, 2 & 3

## What's included so far

**Sprint 0/1:** Auth, JWT, roles. Tables: `cooperatives`, `users`
**Sprint 2:** Member & Farmer management. Tables: `members`, `farmers`
**Sprint 3 (new):** Production management. Table: `production`
- Record a harvest per farmer: product, quantity, unit price, date, season
- `total_amount` is calculated automatically by the server (quantity × unit_price) — never trust client-submitted totals
- Filter production history by farmer, date range, or product name
- `/api/production/summary` — totals grouped by product, for dashboards (matches the "Total Value" cards from your architecture doc)


## Setup (same as before — skip if already done)

```bash
npm install
```
Make sure your `.env` is already configured (from Sprint 0/1) and MySQL/XAMPP is running.

## Run the NEW migrations

This creates the two new tables without touching your existing data:

```bash
npm run migrate
```

You should see two new lines:
```
== 20260101000003-create-members: migrated
== 20260101000004-create-farmers: migrated
```

## Start the server

```bash
npm run dev
```

## Test it (open a second terminal, keep the server running in the first)

**1. Log in again to get a fresh token** (tokens expire after 8 hours):
```bash
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@smartnyamagabe.rw\",\"password\":\"ChangeMe123!\"}"
```
Copy the new `accessToken`.

**2. Register a member** (replace token; cooperative_id 1 should already exist from Sprint 1):
```bash
curl -X POST http://localhost:5000/api/members -H "Content-Type: application/json" -H "Authorization: Bearer PASTE_TOKEN_HERE" -d "{\"first_name\":\"Valentin\",\"last_name\":\"Nshimiyimana\",\"phone\":\"0788123456\",\"gender\":\"male\",\"cooperative_id\":1}"
```
You'll get back the member with an `id` — note it (probably `1`).

**3. List members:**
```bash
curl http://localhost:5000/api/members -H "Authorization: Bearer PASTE_TOKEN_HERE"
```

**4. Turn that member into a farmer** (replace `member_id` with the id from step 2):
```bash
curl -X POST http://localhost:5000/api/farmers -H "Content-Type: application/json" -H "Authorization: Bearer PASTE_TOKEN_HERE" -d "{\"member_id\":1,\"farm_size_ha\":2.5,\"location\":\"Nyamagabe, Gasaka\",\"crop_type\":\"Coffee\"}"
```

**5. List farmers (each one shows its linked member):**
```bash
curl http://localhost:5000/api/farmers -H "Authorization: Bearer PASTE_TOKEN_HERE"
```

If all 5 calls return `"success":true`, Sprint 2 is fully working.

## Test Sprint 3 (open a second terminal, keep the server running in the first)

Run the new migration first:
```bash
npm run migrate
```
Expect: `20260101000005-create-production: migrated`

**1. Log in for a fresh token:**
```bash
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@smartnyamagabe.rw\",\"password\":\"ChangeMe123!\"}"
```

**2. Record a harvest** (using farmer_id 1 from Sprint 2 — Valentin):
```bash
curl -X POST http://localhost:5000/api/production -H "Content-Type: application/json" -H "Authorization: Bearer PASTE_TOKEN_HERE" -d "{\"farmer_id\":1,\"product_name\":\"Coffee\",\"quantity\":200,\"unit\":\"kg\",\"unit_price\":800,\"production_date\":\"2026-06-01\",\"season\":\"2026B\"}"
```
Check the response — `total_amount` should be `160000.00`, calculated automatically, exactly like the example in the architecture document.

**3. List production history:**
```bash
curl http://localhost:5000/api/production -H "Authorization: Bearer PASTE_TOKEN_HERE"
```

**4. Get the dashboard summary (totals grouped by product):**
```bash
curl http://localhost:5000/api/production/summary -H "Authorization: Bearer PASTE_TOKEN_HERE"
```

If all 4 calls return `"success":true` and the total_amount is correct, Sprint 3 is fully working.

## Sprint 4 — Financial Management (new)

**Tables added:** `loans`, `transactions`

Highlights:
- Record income, expense, or savings transactions (each optionally tied to a member)
- Issue a loan → this **automatically creates a `loan_disbursement` transaction** and sets `balance = principal_amount`
- Record a repayment via `POST /api/loans/:id/repay` → this **automatically creates a `loan_repayment` transaction, reduces the loan's balance, and marks it `paid` once balance hits zero** — all done as a single atomic database transaction, so it can never end up half-done
- `GET /api/transactions/summary` — totals by type (income, expense, saving, loan_disbursement, loan_repayment) plus a calculated `net_balance`, scoped to your cooperative. This feeds the dashboard's Income/Expense cards from the architecture doc.
- Only `super_admin`, `cooperative_manager`, and `accountant` can create/edit financial records — matches your role permissions table.

### Run the new migrations

```bash
npm install
npm run migrate
```
Expect two new lines:
```
== 20260101000006-create-loans: migrated
== 20260101000007-create-transactions: migrated
```

### Start the server

```bash
npm run dev
```

### Test it (second terminal)

**1. Log in for a fresh token:**
```bash
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@smartnyamagabe.rw\",\"password\":\"ChangeMe123!\"}"
```

**2. Record income** (e.g. Valentin's coffee sale — member_id 1 from Sprint 2):
```bash
curl -X POST http://localhost:5000/api/transactions -H "Content-Type: application/json" -H "Authorization: Bearer PASTE_TOKEN_HERE" -d "{\"type\":\"income\",\"category\":\"Product Sales\",\"amount\":160000,\"transaction_date\":\"2026-06-05\",\"member_id\":1}"
```

**3. Record an expense** (cooperative-level, no member):
```bash
curl -X POST http://localhost:5000/api/transactions -H "Content-Type: application/json" -H "Authorization: Bearer PASTE_TOKEN_HERE" -d "{\"type\":\"expense\",\"category\":\"Agricultural Inputs\",\"amount\":45000,\"transaction_date\":\"2026-06-06\"}"
```

**4. Issue a loan to Valentin:**
```bash
curl -X POST http://localhost:5000/api/loans -H "Content-Type: application/json" -H "Authorization: Bearer PASTE_TOKEN_HERE" -d "{\"member_id\":1,\"principal_amount\":100000,\"interest_rate\":10,\"issue_date\":\"2026-06-10\",\"due_date\":\"2026-12-10\"}"
```
Check: `loan.balance` should equal `100000.00`, and a `disbursement` transaction is returned alongside it. Note the loan `id`.

**5. Record a partial repayment** (replace `1` with your loan id):
```bash
curl -X POST http://localhost:5000/api/loans/1/repay -H "Content-Type: application/json" -H "Authorization: Bearer PASTE_TOKEN_HERE" -d "{\"amount\":30000,\"repayment_date\":\"2026-07-01\"}"
```
Check: `loan.balance` should now be `70000.00`, status still `active`.

**6. Get the financial summary:**
```bash
curl http://localhost:5000/api/transactions/summary -H "Authorization: Bearer PASTE_TOKEN_HERE"
```
Expect income, expense, loan_disbursement, and loan_repayment totals, plus `net_balance`.

If all 6 calls return `"success":true`, Sprint 4 is fully working.

### Run tests

```bash
npm test
```
Now includes a test proving a new loan's balance is always initialized to its principal amount.

## Sprint 5 — Inventory Management (new)

**Tables added:** `inventory_items`, `inventory_transactions`

Highlights:
- Every stock change is recorded as a movement (`in` or `out`) — `quantity_in_stock` is never edited directly, it's always derived from movements, so you get a full audit trail (who moved what, when, and why)
- Creating an item can optionally include `initial_quantity` to set opening stock as a proper "in" movement
- An `out` movement that would push stock below zero is **rejected** — you can't accidentally issue more fertilizer than you have
- `GET /api/inventory/low-stock` — items at or below their reorder level, ready for a dashboard alert

### Run the new migrations

```bash
npm install
npm run migrate
```
Expect:
```
== 20260101000008-create-inventory-items: migrated
== 20260101000009-create-inventory-transactions: migrated
```

### Start the server

```bash
npm run dev
```

### Test it (second terminal)

**1. Log in for a fresh token:**
```bash
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@smartnyamagabe.rw\",\"password\":\"ChangeMe123!\"}"
```

**2. Create an inventory item with opening stock** (super_admin must include cooperative_id):
```bash
curl -X POST http://localhost:5000/api/inventory -H "Content-Type: application/json" -H "Authorization: Bearer PASTE_TOKEN_HERE" -d "{\"item_name\":\"NPK Fertilizer\",\"category\":\"fertilizer\",\"unit\":\"kg\",\"reorder_level\":50,\"unit_cost\":900,\"initial_quantity\":200,\"cooperative_id\":1}"
```
Check: `item.quantity_in_stock` should be `"200.00"`. Note the item's `id`.

**3. Issue some stock out** (replace `1` with your item id):
```bash
curl -X POST http://localhost:5000/api/inventory/1/movements -H "Content-Type: application/json" -H "Authorization: Bearer PASTE_TOKEN_HERE" -d "{\"type\":\"out\",\"quantity\":180,\"reference\":\"Issued to Valentin Nshimiyimana\",\"transaction_date\":\"2026-07-10\"}"
```
Check: stock should drop to `"20.00"`.

**4. Check low-stock alerts** — since 20kg is below the 50kg reorder level, this item should now appear:
```bash
curl http://localhost:5000/api/inventory/low-stock -H "Authorization: Bearer PASTE_TOKEN_HERE"
```

**5. Try to over-issue stock (should be rejected):**
```bash
curl -X POST http://localhost:5000/api/inventory/1/movements -H "Content-Type: application/json" -H "Authorization: Bearer PASTE_TOKEN_HERE" -d "{\"type\":\"out\",\"quantity\":1000,\"reference\":\"Testing over-issue\",\"transaction_date\":\"2026-07-10\"}"
```
Expect a `"success":false` error saying not enough stock is available — this confirms the safety check works.

If steps 2–5 all behave as described, Sprint 5 is fully working.

### Run tests

```bash
npm test
```
Now includes tests proving stock increases/decreases correctly and that over-issuing is blocked.

## Sprint 6 — Dashboard (new)

**No new tables** — this sprint is pure aggregation logic over everything built in Sprints 1–5.

Highlights:
- `GET /api/dashboard/summary` — one call returns: total/active members, total farmers, production totals, income/expense/net balance, active loans + outstanding balance, low-stock item count. This matches the dashboard mockup in your architecture doc (Total Members, Production, Income, Expenses, Active Farmers).
- `GET /api/dashboard/export` — the same numbers as a downloadable CSV file, for your concept note's "Exportable reports" feature.
- Optional `?from=YYYY-MM-DD&to=YYYY-MM-DD` on both, to scope to a reporting period (e.g. a season or a quarter).
- This sprint's logic was verified with a genuine integration test (in-memory database, seeded with realistic data, running the actual aggregation queries) rather than just a syntax check — see `tests/dashboard.integration.test.js`.

### No migration needed — just restart

```bash
npm install
npm run dev
```

### Test it (second terminal)

**1. Log in for a fresh token:**
```bash
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@smartnyamagabe.rw\",\"password\":\"ChangeMe123!\"}"
```

**2. Get the dashboard summary** (super_admin needs `?cooperative_id=1` to scope to your test cooperative):
```bash
curl "http://localhost:5000/api/dashboard/summary?cooperative_id=1" -H "Authorization: Bearer PASTE_TOKEN_HERE"
```
Based on everything you've entered in Sprints 2–5, expect roughly:
```json
{"success":true,"data":{
  "members":{"total":1,"active":1},
  "farmers":{"total":1},
  "production":{"total_value":160000,"total_quantity":200,"record_count":1},
  "finance":{"income":160000,"expense":45000,"saving":0,"loan_disbursement":100000,"loan_repayment":30000,"net_balance":115000},
  "loans":{"active_count":1,"outstanding_balance":70000},
  "inventory":{"low_stock_count":1}
}}
```

**3. Download the CSV export:**
```bash
curl "http://localhost:5000/api/dashboard/export?cooperative_id=1" -H "Authorization: Bearer PASTE_TOKEN_HERE" -o dashboard-summary.csv
```
This saves a file called `dashboard-summary.csv` in your current folder — open it in Excel or Notepad to check it matches the summary above.

If steps 2 and 3 both work and the numbers match what you've entered so far, Sprint 6 is fully working — and your entire backend (Sprints 1–6) is complete.

### Run tests

```bash
npm test
```
Now 14 tests total, including a full dashboard aggregation test with seeded data.

## Sprint 7 — Documents & Notifications (new)

**Tables added:** `documents`, `notifications`

Highlights:
- **Documents**: upload a file (PDF, JPG, PNG, WEBP, Word, Excel, TXT — 4 MB max) and attach it to a cooperative, member, farmer, or loan. Local development uses the configured `uploads/` folder. Vercel deployments use a connected private Vercel Blob store and keep access behind the authenticated download route. The database continues to store the existing path/URL and metadata, not the file body.

For Vercel, connect a **private** Blob store to the `scfmp` project for Production, Preview, and Development as needed, then redeploy. Current Vercel connections use `BLOB_STORE_ID` with automatic short-lived OIDC authentication; a legacy/token-based connection supplies `BLOB_READ_WRITE_TOKEN`. For local Blob testing, set `DOCUMENT_STORAGE=blob` and pull the server-only environment variables with the Vercel CLI. Never expose Blob credentials through a `VITE_` variable.
- **Notifications**: a per-user inbox with read/unread tracking.
- **Automatic alerts are now live**: when an inventory "out" movement drops stock to or below its reorder level, every active manager of that cooperative automatically gets a notification — you don't have to check `/low-stock` manually anymore, it comes to you. This was verified with a dedicated integration test (`tests/notification.integration.test.js`) proving it notifies the right cooperative's managers and nobody else.

### Run the new migrations

```bash
npm install
npm run migrate
```
Expect:
```
== 20260101000010-create-documents: migrated
== 20260101000011-create-notifications: migrated
```

### Start the server

```bash
npm run dev
```

### Test it (second terminal)

**1. Log in for a fresh token:**
```bash
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@smartnyamagabe.rw\",\"password\":\"ChangeMe123!\"}"
```

**2. Upload a document to Valentin's member profile** (member_id 1 from Sprint 2). File uploads use `-F` instead of `-d` — create any small text file first to use as a test upload:
```bash
echo Test document content > test-file.txt
curl -X POST http://localhost:5000/api/documents -H "Authorization: Bearer PASTE_TOKEN_HERE" -F "file=@test-file.txt" -F "owner_type=member" -F "owner_id=1" -F "description=National ID copy"
```
Check: `"success":true` with the document's `id`, `original_name`, and `file_path`.

**3. List documents for that member:**
```bash
curl "http://localhost:5000/api/documents?owner_type=member&owner_id=1" -H "Authorization: Bearer PASTE_TOKEN_HERE"
```

**4. Download it back** (replace `1` with the document id from step 2):
```bash
curl "http://localhost:5000/api/documents/1/download" -H "Authorization: Bearer PASTE_TOKEN_HERE" -o downloaded-test-file.txt
```
Open `downloaded-test-file.txt` — it should contain the same text you uploaded.

**5. Trigger an automatic low-stock notification** — issue more fertilizer stock out until it's at/below its reorder level (reusing the item from Sprint 5; skip if you already dropped it to 20kg/below 50kg reorder level back then):
```bash
curl -X POST http://localhost:5000/api/inventory/1/movements -H "Content-Type: application/json" -H "Authorization: Bearer PASTE_TOKEN_HERE" -d "{\"type\":\"out\",\"quantity\":5,\"reference\":\"Testing auto-notification\",\"transaction_date\":\"2026-07-14\"}"
```

**6. Check notifications** — log in as the cooperative_manager account (Jean, from Sprint 1) to see the alert land in their inbox:
```bash
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"jean@coop.rw\",\"password\":\"SecurePass123\"}"
```
Copy Jean's token, then:
```bash
curl http://localhost:5000/api/notifications -H "Authorization: Bearer PASTE_JEANS_TOKEN_HERE"
```
You should see a "Low stock alert" notification about the fertilizer, with `is_read: false`.

**7. Mark it read:**
```bash
curl -X PUT http://localhost:5000/api/notifications/1/read -H "Authorization: Bearer PASTE_JEANS_TOKEN_HERE"
```

If all 7 steps behave as described, Sprint 7 is fully working — **and your entire backend is complete.**

### Run tests

```bash
npm test
```
Now 15 tests total across 6 suites, including a dedicated test proving low-stock notifications reach the correct cooperative's managers and nobody else's.

## The backend is done — what's next

Every module from the concept note is now built and tested: Auth & Roles, Cooperatives, Members, Farmers, Production, Finance, Inventory, Dashboard, Documents, and Notifications. Next is either:
- Building the React + Tailwind frontend that connects to all of this, or
- Deploying this backend to a real server (VPS/DigitalOcean) so it's live for your pilot cooperative, per the roadmap's Phase 9/10.

## Addendum — User listing endpoint

Added to support the frontend's Cooperative & User management screens:

- `GET /api/users` — lists staff accounts. `super_admin` sees everyone (optionally filtered by `?cooperative_id=`); `cooperative_manager` sees only their own cooperative's staff. (Creating a user is still done via `POST /api/auth/register`, which already existed.)
- `PUT /api/users/:id/status` — activate/deactivate a staff account. You can't deactivate your own account.

Test it:
```bash
curl http://localhost:5000/api/users -H "Authorization: Bearer PASTE_TOKEN_HERE"
```

### Security fix — user registration

`POST /api/auth/register` previously trusted a `cooperative_id` sent in the request body for *any* caller. Fixed: a `cooperative_manager` can now only ever register staff into their **own** cooperative — the value from their JWT is used, never the request body. Only `super_admin` (who isn't tied to a cooperative) may specify one explicitly. This closes a privilege-escalation gap where a manager could otherwise have registered accounts into a different cooperative. Covered by `tests/register-security.unit.test.js`.

## Addendum — Password management

Two new endpoints, both tested in `tests/password-change.integration.test.js`:

- `PUT /api/auth/change-password` — self-service. The logged-in user provides their current password and a new one (min 6 characters). Rejects with 401 if the current password doesn't match.
  ```bash
  curl -X PUT http://localhost:5000/api/auth/change-password -H "Content-Type: application/json" -H "Authorization: Bearer TOKEN" -d "{\"current_password\":\"OldPass123\",\"new_password\":\"NewPass456\"}"
  ```
- `PUT /api/users/:id/reset-password` — `super_admin` or that cooperative's manager sets a new password for a staff account **without knowing the old one** (for when someone is locked out).
  ```bash
  curl -X PUT http://localhost:5000/api/users/2/reset-password -H "Content-Type: application/json" -H "Authorization: Bearer TOKEN" -d "{\"new_password\":\"TempPass789\"}"
  ```

## Addendum — Password reset via email

A second, self-service recovery option alongside the existing admin-reset method (which is untouched and still works exactly as before).

**New table:** `password_reset_tokens` — stores a SHA-256 hash of each token (never the raw token), an expiry timestamp, and a `used_at` marker for single-use enforcement.

**New endpoints (both public — no login required, since the whole point is the user is locked out):**
- `POST /api/auth/forgot-password` — body `{ email }`. If the email exists and the account is active, generates a token, emails a reset link, and invalidates any earlier unused tokens for that user. Rate-limited to 5 requests per 15 minutes per IP.
- `POST /api/auth/reset-password` — body `{ token, new_password }`. Redeems the token (checked for validity, expiry, and single-use) and sets the new password.

**Configure email sending** — edit `.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tuyishimevalentin10@gmail.com
SMTP_PASS=your_16_character_gmail_app_password
SMTP_FROM=tuyishimevalentin10@gmail.com
RESET_TOKEN_EXPIRES_MINUTES=30
```

**Important — Gmail requires an "App Password", not your normal Gmail password:**
1. Go to your Google Account → **Security**
2. Turn on **2-Step Verification** if it isn't already on (required for App Passwords to be available)
3. Go to **Security → App Passwords**
4. Create one (choose "Mail" as the app), and copy the 16-character code it gives you
5. Paste that 16-character code as `SMTP_PASS` — not your regular Gmail login password, which Gmail will reject over SMTP

**If you haven't configured SMTP yet:** the backend doesn't fail — it logs the reset link directly to your `npm run dev` terminal instead, so you can still test the entire flow end-to-end (copy the link from the console, paste it in your browser) before wiring up real email.

**Run the migration:**
```bash
npm run migrate
```
Expect: `20260101000012-create-password-reset-tokens: migrated`

**Test it:**
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password -H "Content-Type: application/json" -d "{\"email\":\"admin@smartnyamagabe.rw\"}"
```
Then check your server console (or your inbox, if SMTP is configured) for the reset link, and:
```bash
curl -X POST http://localhost:5000/api/auth/reset-password -H "Content-Type: application/json" -d "{\"token\":\"PASTE_TOKEN_FROM_LINK\",\"new_password\":\"NewPassword123\"}"
```

Covered by `tests/password-reset-token.integration.test.js` — proves a fresh token works, a used token is rejected, an expired token is rejected, and requesting a new token invalidates the old one.

## Critical fix — cross-cooperative data leak in Production listing

**What was wrong:** `GET /api/production` (the paginated list endpoint) could show a `super_admin` production records belonging to a **different** cooperative than the one they had selected — with the farmer's name showing blank ("—") on those leaked rows, since the associated data didn't actually match.

**Root cause:** the query filtered by cooperative through a nested relationship (`Production → Farmer → Member → cooperative_id`). Sequelize's default behavior when you combine `limit` (pagination) with an `include` is to run the paginated row-selection as an inner subquery that only considers the *top-level* `where` clause — it silently ignores `where` conditions on nested includes. The cooperative filter was on the nested `Member` include, so pagination completely bypassed it while still correctly filtering the full (non-paginated) result set — meaning it looked correct in a single-cooperative dev/test setup and only broke once a second cooperative existed with its own farmers.

**Fix:** added `required: true` explicitly on both the `Farmer` and nested `Member` includes, and `subQuery: false` on the query — forcing Sequelize to filter in one flat query rather than a two-step subquery that drops the nested condition.

**Verification:** `tests/production-cooperative-isolation.integration.test.js` seeds two cooperatives with their own farmers and production records, and includes a test that **intentionally reproduces the original bug** (proving it existed) alongside tests proving the fix — so this specific regression can never silently return.

Every other paginated list endpoint (loans, members, transactions) was audited and confirmed **not** affected — they all filter `cooperative_id` directly on their own table's column rather than through a nested include, which was never vulnerable to this issue.

