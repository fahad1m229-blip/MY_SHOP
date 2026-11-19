# MY Shop — Super Admin Panel & Backend API

Enterprise-grade Super Admin Panel for **MY Shop** (*"Shop Smart • Live Happy!"*).

## Architecture & Security Separation
- **User Panel (Android App)**: Uses Firebase Client SDK (`app/google-services.json`, `firebase_applet_config.xml`) for Google Sign-In, Firestore, Storage, and Firebase AI Logic.
- **Admin Panel Frontend (`frontend/`)**: Contains **ZERO Firebase Client SDK** and **ZERO Firebase Console config**. Communicates exclusively with the Express backend API using `HttpOnly` session cookies (`credentials: "include"`).
- **Admin Backend (`backend/`)**: Node.js + Express server using **Firebase Admin SDK** with server-side credentials stored strictly in **Render Environment Variables**, accessing the **exact same** MY Shop Firebase database (`gen-lang-client-0209162535` / `ai-studio-android-myshop-e9b08858-2004-4d98-a470-5851be985332`).

## Project Structure
```text
my-shop-admin/
├── storefront/                # Customer Shopping Website (/)
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── welcome-3d.jpg
│   └── logo.svg
├── frontend/                  # Responsive Neon Glassmorphism Admin SPA (/admin)
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── logo.svg
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── config/            # Env loader & Firebase Admin SDK initializer
│   │   ├── middleware/        # HttpOnly Admin & Customer JWT Auth, Rate Limiter, Validation
│   │   ├── services/          # Audit Logs & Firebase Storage multi-image uploads
│   │   ├── routes/            # Public Storefront, Customer, Auth, Dashboard, Catalog, Orders, Customers, Marketing, CMS, Settings
│   │   └── server.js
│   └── test/                  # Node.js backend integration tests
├── .env.example
├── .gitignore
├── render.yaml
└── README.md
```

## Key API Endpoints
| Module | Endpoint | Description |
| :--- | :--- | :--- |
| Health | `GET /api/health` | Service & Firebase Admin connectivity status |
| Auth | `POST /api/admin/auth/login` | Bcrypt verification + `HttpOnly` cookie session |
| Auth | `POST /api/admin/auth/logout` | Clears admin session cookie |
| Auth | `GET /api/admin/auth/me` | Verifies current authenticated admin session |
| Auth | `POST /api/admin/auth/change-password` | Updates bcrypt hash & revokes old sessions |
| Auth | `POST /api/admin/auth/request-recovery` | Generates 15-min hashed recovery token |
| Dashboard | `GET /api/admin/dashboard` | Real-time KPIs, revenue series, best sellers, low stock |
| Products | `GET/POST/PUT/DELETE /api/admin/catalog/products` | Full product CRUD, duplicate, schedule, quick toggles |
| Images | `POST /api/admin/catalog/uploads/images` | Multi-file mobile gallery / desktop upload to Firebase Storage |
| Categories | `GET/POST/DELETE /api/admin/catalog/categories` | Category CRUD & ordering |
| Brands | `GET/POST/DELETE /api/admin/catalog/brands` | Brand management |
| Orders | `GET /api/admin/orders` | List/search orders across `collectionGroup("orders")` |
| Orders | `PATCH /api/admin/orders/:uid/:oid/status` | Update status, tracking code & notify customer |
| Invoices | `GET /api/admin/orders/:uid/:oid/invoice` | Printable HTML invoice |
| Export | `GET /api/admin/orders/export/csv` | Download CSV order report |
| Customers | `GET /api/admin/customers` | Customer list, profile/orders/tickets, suspend/restore |
| Payments | `GET/POST /api/admin/marketing/payments/*` | Gateway status, trusted server verification, refunds |
| Coupons | `GET/POST/DELETE /api/admin/marketing/coupons` | Coupon, Flash Sale & BOGO management |
| Fun Zone | `GET/PUT /api/admin/marketing/fun-zone` | Spin, Scratch, Streak & Referral limits |
| AI | `GET/PUT /api/admin/marketing/ai-settings` | AI assistant prompt & model rules |
| CMS | `GET/PUT /api/admin/cms/site-config` | Website name, logo, colors, announcement bar, banners |
| Popups | `GET/POST/DELETE /api/admin/cms/popups` | Active popup notices & announcements |
| Sellers & Delivery | `GET/POST /api/admin/settings/sellers`, `/delivery` | Seller commission/approval & delivery zones |
| Backup & Audit | `GET /api/admin/settings/backup`, `/audit-logs` | JSON store backup & admin audit trail |

## Render Deployment Instructions
1. Push `my-shop-admin/` to your GitHub repository (`.gitignore` excludes `.env` and service-account JSON).
2. In Render Dashboard, create a **New Blueprint** (using `my-shop-admin/render.yaml`) or a **New Web Service** with Root Directory `my-shop-admin/backend`, Build Command `npm install`, and Start Command `npm start`.
3. Generate an admin password bcrypt hash locally:
   ```bash
   node -e "console.log(require('bcryptjs').hashSync('YourStrongAdminPass123!', 12))"
   ```
4. Set these **Render Environment Variables**:
   - `NODE_ENV=production`
   - `ADMIN_USERNAME=superadmin`
   - `ADMIN_EMAIL=your-email@example.com`
   - `ADMIN_PASSWORD_HASH=<bcrypt hash from step 3>`
   - `JWT_SECRET=<64-char random hex secret>`
   - `ADMIN_FRONTEND_ORIGIN=https://<your-render-service>.onrender.com`
   - `FIREBASE_PROJECT_ID=gen-lang-client-0209162535`
   - `FIRESTORE_DATABASE_ID=ai-studio-android-myshop-e9b08858-2004-4d98-a470-5851be985332`
   - `FIREBASE_STORAGE_BUCKET=gen-lang-client-0209162535.firebasestorage.app`
   - `FIREBASE_SERVICE_ACCOUNT_JSON=<minified service account JSON from Firebase Console>`
5. Open `https://<your-render-service>.onrender.com/admin` on Android phone or desktop and sign in.
