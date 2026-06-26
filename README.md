# Billing Suite (Desktop + API)

Billing Suite is a full-stack billing system composed of:
- `Billing.Api` (`.NET 10` Minimal API + EF Core + MySQL)
- `billing-ui` (React 19 + TypeScript + Vite)
- `electron` shell (desktop runtime bundling UI + API)

---

## Solution Overview

### 1) Backend: `Billing.Api`
Core responsibilities:
- Authentication and user management (`Admin`, `User`)
- Product, brand, category, distributor, salesman masters
- Sales invoices, payments, refunds, customer ledger
- Purchase entries, purchase payments, distributor orders
- VAT reports (sales and purchase)
- Daily tally and cheque-issued tracking
- Maintenance operations (backup, annual reset)

Key technologies:
- ASP.NET Core Minimal APIs
- Entity Framework Core + Pomelo MySQL
- JWT bearer authentication
- FluentValidation

### 2) Frontend: `billing-ui`
Core responsibilities:
- Complete operational UI for masters, transactions, and reports
- Auth flow (`/` login, `/home` dashboard route)
- Route-based pages for billing, purchase, payments, tally, VAT, and other reports
- Toast-based user feedback (`react-toastify`)

Key technologies:
- React 19
- TypeScript
- Vite
- React Router (`HashRouter`)
- `lucide-react`, `jspdf`, `react-toastify`

### 3) Desktop Host: `electron`
Core responsibilities:
- Runs the React UI in desktop windows
- Starts packaged API executable in production
- Exposes desktop bridge (`window.electron`) with:
  - `apiUrl`
  - `openWindow(route)`
  - `printReceipt(html)`

---

## Project Structure

- `Billing.Api/` → Backend API
- `billing-ui/` → React frontend
- `electron/` → Electron main/preload process
- `package.json` (root) → Monorepo scripts for dev/build/package

---

## Local Development

### Prerequisites
- .NET SDK (for `net10.0`)
- Node.js + npm
- MySQL 8+

### Backend config
Update `Billing.Api/appsettings.json`:
- `ConnectionStrings:DefaultConnection`
- `Jwt:Key`, `Jwt:Issuer`, `Jwt:Audience`, `Jwt:ExpireMinutes`

> On startup, migrations are applied and an admin user is seeded if none exists.

### Run full app (desktop + UI + API)
From repository root:

- `npm install`
- `npm run dev`

This starts:
- API (`dotnet run` in `Billing.Api`)
- UI (`vite` in `billing-ui`)
- Electron app (after UI is available)

Useful scripts:
- `npm run dev:api`
- `npm run dev:ui`
- `npm run build`
- `npm run package`

---

## Authentication

- Login endpoint: `POST /auth/login`
- JWT token includes user id (`sub`), username, and role
- Protected endpoints use bearer auth; maintenance routes require admin role

Default seeded credentials (first run):
- `admin / admin123`

---

## Main API Groups

- `/auth/*`, `/users*`
- `/products*`
- `/invoices*`, `/payments`, `/refunds`
- `/customers*`
- `/purchases*`
- `/salesmen*`, `/distributors*`, `/distributor-orders*`
- `/brands*`, `/categories*`, `/gifts*`
- `/reports/*`
- `/daily-tally*`
- `/cheque-issued*`
- `/maintenance/*`

---

## Security Notes

- Move DB/JWT secrets out of `appsettings.json` for production.
- Rotate default admin credentials immediately.
- Restrict CORS origins to trusted clients in deployment.
