# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

IT Place Inventory — an inventory/purchasing/finance management app for a local IT shop. Two independent apps in one repo, no shared package or monorepo tooling:

- `backend/` — Express + Mongoose REST API (ESM, Node).
- `frontend/` — React 19 + Vite SPA (Redux Toolkit + RTK Query, Tailwind v4).

There is no root-level package.json — always `cd` into the relevant sub-project before running npm commands.

## Commands

Backend (`backend/`):
- `npm run dev` — start API with nodemon (reads `backend/.env`; real dev port is **5001**, not the `.env.example` default of 5000)
- `npm start` — start API without nodemon
- `npm run seed` — wipe and repopulate the DB with realistic fixture data (safe to re-run)
- `npm run seed:destroy` — wipe fixture data only

Frontend (`frontend/`):
- `npm run dev` — Vite dev server (default port 5173)
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run preview` — preview a production build

There are no test scripts/frameworks configured in either sub-project.

Run backend and frontend dev servers in separate terminals; the frontend's `VITE_API_URL` (`frontend/.env`) must point at the backend's actual port, and the backend's `CLIENT_ORIGIN` (`backend/.env`) must match the frontend's origin for CORS to work.

## Backend architecture

Layering is strict Express convention: `routes/` → `controllers/` → `models/`, with cross-cutting logic in `utils/` and `services/`. `src/routes/index.js` mounts one router per resource under `/api`. `src/app.js` wires global middleware (helmet, cors, compression, mongo-sanitize, morgan, rate limiting) and error handling; `src/server.js` connects to Mongo then starts listening.

Conventions to follow when extending a resource:
- Controllers use `express-async-handler` and throw `ApiError(statusCode, message, details?)` (`src/utils/ApiError.js`) for error cases; `errorHandler.js` translates Mongoose `ValidationError`/`CastError`/duplicate-key (11000) errors into user-facing messages automatically — don't catch/reword those yourself.
- `auth.js` middleware exposes `protect` (JWT bearer, populates `req.user`) and `authorize(...roles)`. Roles are just `"owner"` and `"employee"` (see `User.js`); most write/reporting endpoints are owner-only (mirrored in the frontend's `RoleRoute` + `navigation.js`).
- List endpoints follow a shared pagination shape: `{ page, limit }` query params (clamped, limit ≤ 100), response `{ success, data, meta: { total, page, pages } }`.
- **Derived/denormalized fields are recomputed, never patched directly.** E.g. `Product.avgBuyingPrice`/`currentStock` are recalculated from the full `Purchase` history via `weightedAverage()` on every purchase (never edit a past purchase's price in place — see comments in `weightedAverage.js` and `purchaseController.js`); `CustomerDue.remainingDue`/`status` are recomputed in a `pre("validate")` hook from `dueAmount`/`paidAmount`. When adding similar money/stock logic, keep the same pattern: store raw history, derive summaries.
- Every stock-changing action (purchase, manual adjustment) writes an `InventoryLog` row (`type: "Purchase" | "Manual Adjustment"`, `resultingStock` snapshot) so movement history is fully reconstructable.
- Most mutating controller actions call `logActivity({ user, action, target })` (`utils/logActivity.js`) to append to the audit trail (`ActivityLog` model, surfaced via `/api/activity-logs`). Add this call when adding new mutations that a shop owner would want an audit trail for.
- `Settings` is a singleton (`Settings.getSingleton()`) holding shop-wide config like `lowStockThreshold`, consumed e.g. by the inventory-status logic in `inventoryController.js`.

## Frontend architecture

All server state goes through a single RTK Query API slice (`src/app/apiSlice.js`) — one `createApi` with one `tagTypes` list and one endpoint per backend route. When adding a backend endpoint, add a matching endpoint here (query or mutation), give it the right `providesTags`/`invalidatesTags`, and export its generated hook. Cross-resource tag invalidation is used deliberately (e.g. creating a purchase invalidates `Purchase`, `Product`, `Inventory`, `Dashboard`, `Report`, `ActivityLog` — mirror this pattern instead of just invalidating the one obviously-related tag).

Client-only Redux slices are minimal and live under `src/features/*/`: `authSlice` (JWT token in `localStorage` under `itplace-token`, current user, derived selectors `selectIsAuthenticated`/`selectIsOwner`), `themeSlice`, `toastSlice`. `authSlice` reacts to the API slice via `addMatcher` on `api.endpoints.login`/`getMe`/`updateMe` rather than owning its own async thunks — follow this pattern for any new auth-adjacent state instead of adding manual fetch logic in components.

Routing (`src/App.jsx`) nests role gating: `AuthGate` (bootstraps session) → `Routes` → `ProtectedRoute` (redirects to `/login` if unauthenticated) → `AppShell` (layout) → optionally `RoleRoute roles={[...]}` (redirects to `/` if role doesn't match). `src/lib/navigation.js` defines the sidebar structure (`NAV_GROUPS`) with a `roles` array per item — **route guards in `App.jsx` and visibility in `navigation.js` must be kept in sync manually**; there's no single source of truth for "who can see/access what."

Path aliases: none — imports are relative. Styling is Tailwind v4 via the `@tailwindcss/vite` plugin (no `tailwind.config.js`; config lives in CSS, see `src/index.css`). UI primitives live in `src/components/ui/`, layout chrome in `src/components/layout/`.
