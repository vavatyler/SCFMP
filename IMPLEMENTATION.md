# SCFMP System Support implementation

This repository now contains the support-document enhancements in the existing backend and frontend applications.

## Delivered capabilities

- Reporting API for members, farmers, production, finance, and inventory with cooperative/farmer authorization, filters, localized headings, JSON data, and CSV download.
- Frontend report toolbar for CSV, real `.xlsx`, paginated PDF, and print output. Reports include SCFMP branding, report/cooperative names, generated date, generator, record count, and PDF page numbers.
- Production records now carry direct `cooperative_id`, `farmer_id`, `product_id`, `season`, `status`, and `production_date` fields. A cooperative product catalog maintains compatibility with the existing `product_name` column.
- Production filters, summary cards, monthly trends, product totals, farmer performance, cooperative comparison data, and paginated records.
- English (`en`), Kinyarwanda (`rw`), and French (`fr`) with a persistent user preference and local fallback.
- Single-use, hashed password-reset tokens with expiry and account-enumeration-safe responses.
- One-time rotating, hashed refresh tokens. Password, account-status, and role changes invalidate existing sessions.
- Shared accessible password input on login, reset, change-password, and team password forms.
- Responsive navigation, mobile overlay, touch-sized controls, language selector, and user menu.
- Append-only audit events for login success/failure, user creation, status/role changes, password changes, and resets.
- Farmer accounts are restricted to the member, farmer, production, finance, loan, dashboard, and report records linked to their own user account.
- Hardened CORS, request-size limits, JWT issuer/audience/type checks, login/reset rate limits, SQL parameterization through Sequelize, React output escaping, bcrypt hashing, and upload MIME/extension/size restrictions.

## New database migrations

Run all migrations in order:

```bash
cd scfmp-backend
npm install
npm run migrate
```

The new migrations are:

1. `20260811000013-add-user-language-and-token-version.js`
2. `20260811000014-enhance-production.js`
3. `20260811000015-create-audit-logs.js`
4. `20260811000016-create-refresh-tokens.js`

Migration 14 backfills every existing production row's cooperative through `farmer -> member`, creates a cooperative product from its legacy `product_name`, assigns `product_id`, and then applies non-null constraints.

## New frontend dependencies

- `i18next`, `react-i18next`
- `jspdf`, `jspdf-autotable`
- `xlsx`
- Backend document storage: `@vercel/blob`

## Required production environment

Set these in Vercel Project Settings → Environment Variables for Production and Preview as appropriate:

```text
NODE_ENV=production
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
JWT_SECRET=<long random secret>
JWT_REFRESH_SECRET=<different long random secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=scfmp-api
JWT_AUDIENCE=scfmp-web
CLIENT_URL=https://YOUR-PROJECT.vercel.app
SMTP_HOST=<smtp host>
SMTP_PORT=587
SMTP_USER=<smtp user>
SMTP_PASS=<smtp app password>
SMTP_FROM=SCFMP <no-reply@your-domain>
RESET_TOKEN_EXPIRES_MINUTES=30
DOCUMENT_STORAGE=blob
```

If your provider supplies separate MySQL variables instead of `DATABASE_URL`, use `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. Set `DB_SSL=false` only when the provider explicitly does not support TLS.

Do not set `VITE_API_URL` for the combined Vercel project; the frontend intentionally calls the same deployment at `/api`.

## Vercel deployment

1. Provision a persistent managed MySQL database. Vercel Functions do not provide a persistent local database.
2. Create or connect a Vercel Blob store in the project Storage settings. It automatically supplies `BLOB_READ_WRITE_TOKEN` (or OIDC storage variables). SCFMP stores documents as private blobs and streams them only through the authenticated download endpoint.
3. Set the environment variables above.
4. Run migrations once against that production database from a trusted terminal with the same database environment variables.
5. Import the repository in Vercel with the repository root as Root Directory. Leave the Framework Preset on Vite/Other (do not select the experimental Services preset). The checked-in `vercel.json` builds the Vite frontend and routes `/api/*` to the supported `api/index.js` Express function.
6. Deploy, then verify `/api/health`, login, one scoped list, production analytics, a report export, and a document upload/download.

Local development retains filesystem storage when `DOCUMENT_STORAGE=local`. On Vercel, uploads fail safely with a clear configuration error if no Blob store is connected; they are never treated as durable `/tmp` files.

## Verification commands

```bash
npm install --prefix scfmp-frontend
npm run build --prefix scfmp-frontend
npm install --prefix scfmp-backend
npm test --prefix scfmp-backend
```
