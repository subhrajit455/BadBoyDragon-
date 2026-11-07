# Construction Inventory & Billing System (MERN)

A modern full-stack ERP & Billing platform for construction materials management.

---

## 🏗️ Project Architecture

```
.
├── .gitignore
├── README.md
├── server/
│   ├── config/
│   │   └── db.js                 # Mongoose connection with replica set support
│   ├── controllers/
│   │   ├── authController.js     # Admin login, logout, me, change-password
│   │   └── healthController.js   # Health & MongoDB replica transaction tester
│   ├── middleware/
│   │   ├── authMiddleware.js     # requireAuth JWT cookie validator
│   │   └── errorHandler.js       # Central 404 & 500 error handler
│   ├── models/
│   │   ├── User.js               # Admin identity (name, email, passwordHash)
│   │   ├── Settings.js           # Business profile & invoice settings
│   │   └── Counter.js            # Auto-increment sequence tracker
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth/* with express-rate-limit
│   │   ├── healthRoutes.js       # /api/health & /api/health/db
│   │   └── index.js              # Central API router with requireAuth protection
│   ├── scripts/
│   │   └── seedAdmin.js          # npm run seed:admin script
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── server.js                 # Express server (CORS, Helmet, Morgan)
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── auth/
    │   │   │   └── ProtectedRoute.jsx # Route guard (redirects unauthenticated to /login)
    │   │   ├── layout/
    │   │   │   ├── Layout.jsx    # Shell layout with top bar (admin info + logout)
    │   │   │   └── Sidebar.jsx   # Dark sidebar with 10 navigation links
    │   │   └── ui/               # Reusable design system components
    │   │       ├── Button.jsx    # primary / secondary / danger / ghost
    │   │       ├── Input.jsx     # Input with label, validation error, rightElement
    │   │       ├── Card.jsx      # Card, CardHeader, CardBody, CardFooter
    │   │       └── Spinner.jsx   # Loading spinner
    │   ├── context/
    │   │   └── AuthContext.jsx   # Auth provider checking /api/auth/me on load
    │   ├── lib/
    │   │   ├── api.js            # Axios client with bearer-token authentication
    │   │   ├── authToken.js      # localStorage access-token helpers
    │   │   └── queryClient.js    # TanStack Query client configuration
    │   ├── pages/
    │   │   ├── Login.jsx         # Centered card login with show/hide password
    │   │   ├── Settings.jsx      # Admin profile & Change Password form
    │   │   ├── Dashboard.jsx
    │   │   ├── Products.jsx
    │   │   ├── Purchases.jsx
    │   │   ├── Inventory.jsx
    │   │   ├── Pricing.jsx
    │   │   ├── Customers.jsx
    │   │   ├── Billing.jsx
    │   │   ├── Ledgers.jsx
    │   │   └── Reports.jsx
    │   ├── App.jsx               # Protected route tree
    │   ├── index.css             # Tailwind base & utilities
    │   └── main.jsx              # React DOM entry with AuthProvider & Router
    ├── .env.example
    ├── .env
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.js
```

---

## ⚙️ Prerequisites

1. **Node.js**: v18+ (v20+ recommended)
2. **MongoDB**: v6.0+ installed locally

---

## 🍃 Local MongoDB Replica Set Setup (`rs0`)

Mongoose sessions and multi-document transactions require a replica set. Even on a single development machine, MongoDB can run as a **single-node replica set**.

### Step 1: Start MongoDB with Replica Set enabled

#### Option A: Running via Command Line / PowerShell
Stop any existing MongoDB service if running, then start `mongod` pointing to your db path with `--replSet rs0`:

```powershell
mongod --replSet rs0 --dbpath "C:\data\db" --port 27017
```
*(Make sure the directory `C:\data\db` exists: `mkdir -p C:\data\db`)*

#### Option B: Updating `mongod.cfg` (Windows Service)
If running MongoDB as a Windows service, edit `C:\Program Files\MongoDB\Server\<version>\bin\mongod.cfg`:
```yaml
replication:
  replSetName: "rs0"
```
Restart the service in PowerShell (as Administrator):
```powershell
Restart-Service MongoDB
```

### Step 2: Initiate the Replica Set
Open a terminal and connect with `mongosh`:

```powershell
mongosh
```

In the `mongosh` prompt, run:
```javascript
rs.initiate()
```

Verify that the replica set is primary:
```javascript
rs.status().ok
```
It should return `1`

---

## 🔑 Initializing the Admin Account

In `server/.env`:
```env
ADMIN_NAME=Super Admin
ADMIN_EMAIL=admin@construction.local
ADMIN_PASSWORD=AdminPassword123!
```

Run the seed script:
```powershell
cd server
npm run seed:admin
```
*If the admin user already exists, the script safely skips creation.*

---

## 🚀 Running the Project

### 1. Start the Server

```powershell
cd server
npm run dev
```
The server will start on `http://localhost:5000`.

### 2. Start the Client

Open a separate terminal:
```powershell
cd client
npm run dev
```
The client will start on `http://localhost:5173`.

---

## 🧪 Manual Test Checklist

1. **Visit `/` without logging in:**
   - Navigating to `http://localhost:5173` immediately redirects to `http://localhost:5173/login`.
2. **Test Login Form Validation:**
   - Submitting empty email or invalid email shows inline validation errors.
   - Click the eye icon in the password field to toggle password visibility.
3. **Test Invalid Login:**
   - Attempt login with `admin@construction.local` and an incorrect password.
   - Shows generic error message: `Invalid email or password`.
4. **Test Rate Limiter:**
   - Submitting 10 wrong login attempts within 15 minutes triggers a 429 rate limit response: `Too many login attempts. Please try again after 15 minutes.`
5. **Test Successful Login:**
   - Enter `admin@construction.local` and `AdminPassword123!`.
   - Browser receives an `httpOnly`, `sameSite=lax` cookie named `token`.
   - Client redirects smoothly to `/dashboard`.
6. **Verify Top Bar & Profile:**
   - The top bar displays the admin name and email avatar badge.
   - A `Logout` button is visible in the top right.
7. **Verify Protected Routes:**
   - While logged in, navigating to `/login` automatically redirects away to `/dashboard`.
   - Direct navigation to `/products`, `/billing`, `/settings`, etc., works seamlessly.
8. **Test Change Password:**
   - Go to `Settings` (`/settings`).
   - In the "Change Password" card, enter an incorrect current password -> shows error `Incorrect current password`.
   - Enter the correct current password and a new password (min 6 characters) -> shows success message `Password changed successfully.`.
9. **Test Logout:**
   - Click the `Logout` button in the top bar.
   - The cookie `token` is cleared.
   - The application immediately redirects to `/login`.


---

## 📦 Products Module (Multi-Unit Conversion)

### Master Units List
`bag, kg, ton, quintal, piece, brass, trolley, sq ft, sq m, cu ft, cu m, meter, feet, litre, bundle, box, set` (Available via `GET /api/meta/units`).

### Endpoints
- `GET /api/products`: Search by name, filter by category & status, with pagination.
- `GET /api/products/:id`: Fetch single product by ID.
- `POST /api/products`: Create new product with base unit and conversion ratios.
- `PUT /api/products/:id`: Update product specifications (base unit and factor changes are locked if stock transactions exist).
- `PATCH /api/products/:id/status`: Toggle archive/restore status (no hard deletion).


---

## 🛒 Purchase, Suppliers & Inventory API

### Endpoints

#### 1. Suppliers
- `GET /api/suppliers`: Search by name/phone/GSTIN, filter by status, with pagination & current balance.
- `GET /api/suppliers/:id`: Get supplier profile with current ledger balance.
- `POST /api/suppliers`: Create supplier (optional `openingBalance`).
- `PUT /api/suppliers/:id`: Update supplier details (opening balance locked once transactions exist).
- `PATCH /api/suppliers/:id/status`: Soft archive/restore.
- `POST /api/suppliers/:id/payments`: Record supplier payment (transactional, debit ledger entry).
- `GET /api/suppliers/:id/ledger?from=&to=`: Statement with opening balance, chronologically ordered entries with running balance, and closing balance.

#### 2. Purchases (All in 1 MongoDB Transaction)
- `GET /api/purchases`: Filter by supplier, date range, status, search by `purchaseNo`, with pagination.
- `GET /api/purchases/:id`: Purchase details with line snapshots.
- `POST /api/purchases`: Create purchase invoice with auto-generated `PUR-YYYY-0001` sequence:
  - Updates stock and computes weighted average cost per baseUnit:
    `newAvg = (oldStock * oldAvg + baseQty * ratePerBaseUnit) / (oldStock + baseQty)`
  - Creates `StockMovement` (+baseQty) with stockAfter.
  - Creates supplier credit `LedgerEntry` for grandTotal.
  - If `paidAmount > 0`, creates supplier debit `LedgerEntry`.
- `POST /api/purchases/:id/cancel`: Cancel purchase in 1 transaction:
  - Reverses stock for each item (rejected if current stock would fall below 0).
  - Appends reversing `StockMovement` (-baseQty).
  - Appends reversing credit & debit `LedgerEntry` records.

#### 3. Inventory & Stock Adjustments
- `GET /api/inventory`: Products with stock, base unit, avgCost, valuation, and lowStock flag.
- `GET /api/inventory/:productId/movements`: Paginated stock movement ledger for a product.
- `POST /api/inventory/:productId/adjust`: Adjust stock with mandatory reason in a transaction.

### Automated Testing
Run Vitest on the local replica set:
```bash
cd server
npm test
```
