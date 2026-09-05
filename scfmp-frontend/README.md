# AgriBridge Frontend

AgriBridge is the SmartBridge Technologies Ltd product delivered from the legacy `scfmp-frontend` package. Internal package and route identifiers retain their existing names for compatibility.

## What's included so far

**Sprint 1:** Login, session persistence, dashboard with live backend data
**Sprint 2 (new):** Members and Farmers screens

Sprint 2 highlights:
- **Members page** (`/members`) — searchable table of everyone in your cooperative, with a debounced live search and an "Add member" form
- **Member detail page** (`/members/:id`) — click any member's name to see their full details, and their farmer profile if they have one
- **"Add farmer profile" flow** — right from a member's detail page, turn them into a farmer with crop type, farm size, and location — no separate screen needed
- **Farmers page** (`/farmers`) — a flat list of everyone with a farm profile, for a quick agricultural overview

Everything here calls your real backend — the same `/api/members` and `/api/farmers` endpoints you tested with curl in backend Sprint 2.

## 1. Prerequisites

- Your **backend** (`scfmp-backend`) must be running first, on `http://localhost:5000` — this frontend has nothing to show without it. Open a Command Prompt in your backend folder and run `npm run dev` before continuing.
- Node.js (you already have this from the backend setup)

## 2. Setup

If this is your first time setting up the frontend, unzip it into a folder **next to** (not inside) your `scfmp-backend` folder — e.g.:
```
SCFMP/
  scfmp-backend/
  scfmp-frontend/
```

If you're updating an existing frontend folder with this new Sprint 2 zip, there's no secret `.env` data to preserve here (just the API URL) — it's safe to extract fresh over the old folder, or replace it entirely.

Open a Command Prompt window and navigate to this folder:
```
cd "C:\Users\USER\Desktop\YCA 2026 Application\SCFMP\scfmp-frontend"
```

Install dependencies:
```
npm install
```

If you don't already have a `.env` file here, create one:
```
copy .env.example .env
```
The default inside already points to `http://localhost:5000/api`, which matches your backend — no editing needed unless you changed your backend's port.

## 3. Run it

```
npm run dev
```

You should see:
```
VITE ready in ... ms
➜  Local:   http://localhost:5173/
```

Open your browser and go to:
```
http://localhost:5173
```

**Remember:** you need **three** Command Prompt windows open at once — backend server, frontend server, and a free one for anything else. All three stay open while you work.

## 4. Try it

1. Log in as `admin@smartnyamagabe.rw` / `ChangeMe123!`
2. Click **Members** in the sidebar — you should see Valentin Nshimiyimana, already showing a "Coffee" farmer badge (from your backend testing)
3. Click **Add member** and register a new one
4. Click into a member without a farmer profile and try **Add farmer profile**
5. Click **Farmers** in the sidebar to see the flat list

You can also log out and log in as `jean@coop.rw` / `SecurePass123` — as a `cooperative_manager`, Jean sees the same data automatically scoped to his cooperative, no extra setup needed.

## Sprint 3 — Production Management (new)

- **Production page** (`/production`) — a history table of every harvest recorded, showing farmer, product, quantity, unit price, total value, and date
- **"Record harvest" form** — pick a farmer from a dropdown (populated from your real farmers), enter product/quantity/unit price, and a **live-calculated total** appears instantly as you type — before you even submit. The backend then recalculates and saves the authoritative value itself, exactly matching what you saw on screen.
- The "Record harvest" button is disabled with a tooltip if no farmer profiles exist yet, since a harvest can't be recorded without one

## What's not built yet

Inventory and Documents are still greyed out in the sidebar — those come in the next sprints, the same way we built the backend, one module at a time.

## Sprint 4 — Financial Management (new)

- **Finance page** (`/finance`) — summary cards for income, expenses, and net balance up top, with two tabs below: **Transactions** and **Loans**
- **Add transaction** — record income, an expense, or a saving, optionally tied to a member
- **Issue loan** — pick a member, set the principal and interest rate; the loan and its disbursement transaction are created together automatically, exactly like your backend's atomic operation
- **Record repayment** — click the button on any active loan, see its current balance, enter a repayment amount, and watch the balance update (and the loan flip to "paid" automatically once it hits zero)

## Sprint 5 — Inventory Management (new)

- **Inventory page** (`/inventory`) — table of every stock item, with quantity and reorder level shown side by side
- Items at or below their reorder level get a clay-red **"Low stock"** badge and a warning icon, so a manager can spot problems at a glance — no need to check notifications separately
- **Add item** — name, category, unit, reorder level, and optional opening stock (recorded as a proper "in" movement on the backend, not just typed into the stock count)
- **Stock in / Stock out** buttons on every row open a movement form showing the current balance; attempting to take out more than what's in stock is rejected by the backend with a clear error message, same as your curl testing proved

## Sprint 6 — Documents & Notifications (new)

This completes every module from your concept note in the frontend.

- **Notification bell** — now visible in the top-right of every page. Shows an unread count badge, and a dropdown listing recent notifications with a "mark as read" button on each, plus a "mark all read" shortcut. It quietly refreshes every 30 seconds.
- **Automatic low-stock alerts now show up here** — log in as Jean (`jean@coop.rw`) after dropping fertilizer stock below its reorder level in the Inventory page, and you'll see the alert appear in his bell without doing anything else — the same automation your backend already proved in curl testing.
- **Documents page** (`/documents`) — upload a file, attach it to a member, and see everyone's documents in one table with download and delete actions
- **Documents section on each member's detail page** — upload and manage that specific member's files without leaving their profile

## The frontend now covers every backend module

Auth, Cooperatives (via role-scoping), Members, Farmers, Production, Finance, Inventory, Dashboard, Documents, and Notifications — all connected to your real, tested backend.

## Sprint 7 — Multi-Cooperative & Team Management (new)

This is a significant upgrade: the platform now properly supports **many cooperatives**, not just one.

- **Cooperative switcher** — a dropdown in the top-left of every page (visible only to `super_admin`) showing which cooperative you're currently viewing. Every page — Members, Farmers, Production, Finance, Inventory, Documents, Dashboard — now reflects whichever cooperative is selected. This replaces the old hardcoded "cooperative #1" behavior entirely.
- **Cooperatives page** (`/cooperatives`, super_admin only) — register new cooperatives, see them all in one table, and jump into any of them with one click.
- **Staff Accounts page** (`/staff`, super_admin and cooperative_manager) — this is the account-creation flow: create `cooperative_manager`, `accountant`, or `field_officer` accounts, scoped automatically to the right cooperative. A `cooperative_manager` can only ever create staff for their own cooperative — enforced on the backend, not just hidden in the UI. Deactivate/reactivate accounts with one click.
- Two small fixes: the notification dropdown now has a subtle backdrop so it clearly reads as an overlay instead of looking like cut-off cards, and tiny file sizes in Documents now show as "24 B" instead of a confusing "0.0 KB".

### How to register your second cooperative and its manager

1. Log in as `admin@smartnyamagabe.rw`
2. Go to **Cooperatives** → **Add cooperative** → fill in the name and location, save. You'll automatically switch into it.
3. Go to **Staff Accounts** → **Add team member** → set role to **Cooperative Manager**, give them a temporary password
4. Log out, log in as that new manager — they'll only ever see their own cooperative's data, with no cooperative switcher (they don't need one)

### Backend change required

This sprint needs the matching backend update (adds `GET /api/users` and a security fix to registration) — make sure you've also updated your `scfmp-backend` folder with the latest zip before testing this.

## What's next

From here: deploying both frontend and backend to a real server for your pilot cooperative.

## Sprint 8 — Polish: Edit/Delete + Password Management (new)

**Backend change required** — this sprint adds two new endpoints (`PUT /api/auth/change-password`, `PUT /api/users/:id/reset-password`). Update your `scfmp-backend` folder with the latest zip too.

**Password management:**
- **Change password** — new option at the bottom of the sidebar for every logged-in user. Requires your current password, matching what you'd expect from any real app.
- **Reset password** — on the Staff Accounts page, `super_admin` and `cooperative_manager` can reset a staff member's password without knowing their old one (for when someone's locked out). A temporary password is shown to share with them directly.

**Edit and delete, added across every module that was missing it:**
- **Members** — Edit and Delete buttons on the member detail page; editing is inline (no separate page), deleting asks for confirmation first
- **Farmer profiles** — an Edit button now appears once a member has a farmer profile (previously you could only create one, never change it)
- **Cooperatives** — Edit button per row, opens the same form used to create one, pre-filled
- **Inventory items** — Edit button changes name/category/unit/reorder level/cost (stock quantity still only changes via Stock in/out, by design); Delete removes an item entirely
- **Transactions** — Edit and Delete on any income/expense/saving entry. Loan-linked transactions (disbursements, repayments) intentionally have no edit/delete button — the backend protects those, so the UI doesn't offer an action that would just fail
- **Production records** — Edit and Delete on any harvest entry. The farmer can't be changed after creation (matching the backend), so that field is disabled — the UI dims it and explains why instead of pretending it's editable

Every delete asks for confirmation first, and every edit form pre-fills with the current values so you're never starting from blank.

## Sprint 9 — Password Visibility Toggle (new)

Every password field in the app now has an eye icon to show/hide what you've typed — a small `PasswordInput` component (`src/components/PasswordInput.jsx`) wraps a plain input and handles the toggle, so it's consistent everywhere:

- **Login page**
- **Staff Accounts → Add team member** (the temporary password field)
- **Staff Accounts → Reset password** (admin-set password field)
- **Change password** modal (all three fields: current, new, confirm)

No backend changes needed — this is purely a frontend/UX improvement. Accessible via keyboard and screen readers (`aria-label` and `aria-pressed` on the toggle button), and it never submits the form when clicked.

## Sprint 10 — Password Reset via Email (new)

**Backend update required** — see the backend README's "Password reset via email" addendum for the new endpoints, migration, and Gmail setup instructions.

- **"Forgot password?" link** on the login page
- **Forgot password page** (`/forgot-password`) — presents both recovery options side by side, exactly as specified: **"Reset via email"** (the new self-service flow) and **"Ask your cooperative admin"** (explains the existing admin-reset method from the Team page still works, unchanged)
- **Reset password page** (`/reset-password?token=...`) — this is where the emailed link lands. Enter a new password twice, submit, done. Handles expired/invalid/already-used tokens with clear error messages instead of a generic failure.

Both pages are public (no login required — that's the whole point) and match the login page's visual identity.

### Try it

1. Go to the login page, click **Forgot password?**
2. Choose **Reset via email**, enter `admin@smartnyamagabe.rw`
3. **If your backend's SMTP isn't configured yet:** check the backend's `npm run dev` terminal — the reset link is printed there
4. **If SMTP is configured:** check that inbox
5. Open the link, set a new password, confirm you can log in with it

## What's next

Enhancement #3 from your list: Production module improvements — additional filters (product, season, status) and a dashboard with charts/trends.

