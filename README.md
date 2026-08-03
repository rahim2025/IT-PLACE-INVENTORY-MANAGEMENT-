# IT Place Inventory

Inventory, purchasing, sales, and finance management app for a local IT shop — stock levels, purchases, sales, employee payroll, broker commissions, customer credit (dues), and reporting/invoicing, all in one place.

Two independent apps in one repo, no shared package or monorepo tooling:

- **`backend/`** — Express + Mongoose REST API (ESM, Node)
- **`frontend/`** — React 19 + Vite SPA (Redux Toolkit + RTK Query, Tailwind v4)

## Getting started

### Prerequisites

- Node.js
- A running MongoDB instance (local or remote)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in MONGO_URI, JWT_SECRET, etc.
npm run dev              # starts the API on the port set in .env
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL to match the backend's actual port
npm run dev              # starts the Vite dev server (default port 5173)
```

Run both dev servers at the same time, in separate terminals. Make sure:

- `frontend/.env`'s `VITE_API_URL` points at the backend's actual port
- `backend/.env`'s `CLIENT_ORIGIN` matches the frontend's origin, or CORS requests will fail

### 3. Log in

There's no seed script — `POST /api/auth/signup` always creates accounts with role `"user"` (no access until promoted), and `POST /api/auth/register` (which can create an `"owner"`) is itself owner-only. On a fresh database, sign up once via the app, then manually set that user's `role` to `"owner"` directly in MongoDB to bootstrap the first account.

## Commands

**Backend** (`backend/`)

| Command | Description |
|---|---|
| `npm run dev` | Start the API with nodemon |
| `npm start` | Start the API without nodemon |

**Frontend** (`frontend/`)

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview a production build |

There are no automated test suites configured in either sub-project.

## Roles

The app has two roles:

- **Owner** — full access: catalog, stock, sales, employees, brokers, expenses, customer dues, reports/invoices, and settings.
- **Employee** — day-to-day operations only: products, purchase entry/history, sale entry, and inventory. No access to payroll, brokers, expenses, customer dues, reports, or settings.

## Feature areas

- **Catalog** — products, brands, categories (created inline as you go — no separate management screens)
- **Stock** — purchase entry/history, sale recording, manual stock adjustments, full inventory movement log
- **People** — employees (with monthly salary + advance/loan tracking), brokers (commission owed/paid ledger)
- **Finance** — company expenses, customer due records, broker commission tracking
- **Reporting** — dashboard, period reports (daily/weekly/monthly/yearly), and a generated PDF invoice covering sales and/or cost categories for a chosen date, month, or range
