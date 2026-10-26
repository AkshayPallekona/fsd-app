# Production-Oriented Full-Stack Property Listing & Rental Portal

A secure, accessible, production-oriented full-stack web portal for discovering, listing, and inquiring about rental and sale properties. Built with vanilla modern web standards—no frontend frameworks—backed by an enterprise-grade Express.js REST API and MongoDB with Mongoose.

---

## 1. Overview

The **Property Listing & Rental Portal** bridges the gap between prospective tenants/buyers (Seekers) and property owners/agents (Owners). It offers verified property discovery, advanced search and filtering, inquiry and tour scheduling with automated conflict detection, listing lifecycle moderation, and comprehensive administration tools with tamper-proof audit trails.

> **Portal Notice & Legal Disclaimer:**  
> The platform provides listing discovery and direct inquiry coordination only. The platform does not execute lease agreements, process security deposits, manage escrow accounts, or handle rental payments. All contracts and financial transactions are conducted strictly offline between parties.

---

## 2. Features

- **Multi-Role RBAC:**
  - `seeker`: Browse listings, submit inquiries, book viewing tours, save favorites, and report misleading listings.
  - `owner`: Create and manage properties, upload photo galleries, track inquiries, accept/decline viewing appointments, and respond to reports.
  - `admin`: Review and moderate listings in real time, suspend/reactivate accounts, manage safety reports, and inspect system audit logs.
- **Authentication & Security:**
  - Bcryptjs password hashing (cost factor ≥ 12) with complexity policy.
  - Stateless JSON Web Tokens (JWT) stored in `HttpOnly`, `SameSite=Lax` cookies (`Secure` in production).
  - Instant session invalidation via DB-backed `tokenVersion` increments on password changes.
  - Account suspension protection (blocked immediately via DB check on every authenticated request).
  - Single-use, SHA-256 hashed password reset tokens with a 30-minute MongoDB TTL index.
  - CSRF defense enforcing custom `X-Requested-With` headers combined with strict `Origin`/`Referer` validation.
  - Body payload limit of 10 KB, NoSQL injection sanitizer, and fine-grained rate limiters.
- **Property Lifecycle & Moderation:**
  - Status pipeline: `draft` → `pending_review` (when moderation is enabled) → `published` → `unpublished`, `rented`, `sold`, `archived`.
  - Enforced in a single domain service function with strict transition invariants.
  - Editing key property fields automatically triggers re-moderation when moderation is active.
  - Public endpoints expose sanitized owner metadata (name and member-since date), protecting private contact details.
- **Search & Filter Engine:**
  - Debounced search query (`q`) matching text indexes and regex-escaped fields.
  - Allowlisted filters: city, locality, property type, purpose, price min/max, bedrooms, bathrooms, area, furnishing status, and amenities.
  - URL query string synchronization with pagination.
- **Inquiry & Tour Conflict Prevention:**
  - Dual inquiry types: general questions (`inquiry`) and scheduled tours (`viewing`).
  - Scheduling conflict detection: prevents owners from accepting overlapping viewing appointments within ±60 minutes (returns `409 Conflict`).
  - Duplicate pending inquiry prevention per seeker per property.
- **Safety Reports & Audit Logging:**
  - Seeker property reporting mechanism with owner response capability.
  - Every administrative action (moderation, user suspension, listing removal) generates an immutable, secret-free `AuditLog`.
- **Hybrid Image Storage:**
  - Dual adapters: Local disk storage for development/testing, Cloudinary CDN for production.
  - In-memory Multer storage inspecting true magic bytes (JPEG, PNG, WebP) up to 5 MB per file.
  - Automatic storage cleanup if database persistence fails.
- **Accessible Vanilla Frontend:**
  - 24 semantic HTML5 pages styled with a navy, white, and sapphire accent palette.
  - Accessible forms with focus states, labels, alt text, ARIA live regions for toasts, and confirmation modals for destructive operations.

---

## 3. Stack

- **Frontend:** HTML5, CSS3 (Flexbox & CSS Grid), Vanilla ES6+ JavaScript modules, Fetch API.
- **Backend:** Node.js (v20 LTS / v24), Express 4.x.
- **Database:** MongoDB with Mongoose 8.x ODM.
- **Security & Utilities:** `helmet`, `cors`, `express-rate-limit`, `cookie-parser`, `express-validator`, `bcryptjs`, `jsonwebtoken`, `multer`, `dotenv`, `morgan`, `nodemailer`, `cloudinary`.
- **Testing:** `jest`, `supertest`, `mongodb-memory-server`, `jest-environment-jsdom`, `eslint`.

---

## 4. Directory Structure

```
├── client/
│   ├── assets/
│   │   ├── css/
│   │   │   └── style.css            # Responsive navy/white design system
│   │   └── js/
│   │       ├── api.js               # Universal Fetch wrapper (CSRF header, credentials, error normalization)
│   │       ├── auth.js              # Session & profile management
│   │       ├── guards.js            # Route guards (login & access-denied redirects)
│   │       ├── layout.js            # Injects shared navbar and footer
│   │       └── ui.js                # Toasts, loaders, confirmation dialogs, safe DOM helpers
│   ├── components/
│   │   └── property-card.js         # Safe property card element constructor
│   └── pages/                       # All 24 application views
│       ├── 404.html
│       ├── access-denied.html
│       ├── admin-dashboard.html & js
│       ├── create-listing.html & js
│       ├── details.html & js
│       ├── edit-listing.html & js
│       ├── edit-profile.html & js
│       ├── forgot-password.html & js
│       ├── home.html & js
│       ├── inquiry-management.html & js
│       ├── login.html & js
│       ├── moderation.html & js
│       ├── my-inquiries.html & js
│       ├── my-listings.html & js
│       ├── owner-dashboard.html & js
│       ├── privacy.html
│       ├── profile.html & js
│       ├── register.html & js
│       ├── reports.html & js
│       ├── reset-password.html & js
│       ├── saved.html & js
│       ├── search.html & js
│       ├── terms.html
│       └── user-management.html & js
├── scripts/
│   ├── createAdmin.js               # CLI interactive or env-based admin generator
│   └── seed.js                      # Development seed data (refuses to run in production)
├── server/
│   ├── app.js                       # Express app configuration & middleware pipeline
│   ├── server.js                    # Process lifecycle & MongoDB startup
│   ├── config/
│   │   ├── db.js                    # Mongoose connection manager
│   │   └── env.js                   # Strict environment variable validation
│   ├── constants/
│   │   ├── inquiry.js
│   │   ├── property.js
│   │   └── roles.js
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification & MongoDB user reloading
│   │   ├── csrf.js                  # Custom header + Origin/Referer validator
│   │   ├── errorHandler.js          # Standardized JSON error response handler
│   │   ├── rateLimiters.js          # General API and strict Auth limiters
│   │   ├── roles.js                 # Role-based authorization
│   │   ├── sanitizer.js             # Recursive NoSQL query operator sanitizer ($ and .)
│   │   ├── upload.js                # Multer memory storage configuration
│   │   └── validator.js             # Express-validator error handler
│   ├── models/
│   │   ├── AuditLog.js
│   │   ├── Favorite.js
│   │   ├── Inquiry.js
│   │   ├── PasswordResetToken.js
│   │   ├── Property.js
│   │   └── User.js
│   ├── routes/
│   │   ├── admin.routes.js
│   │   ├── auth.routes.js
│   │   ├── favorite.routes.js
│   │   ├── health.routes.js
│   │   ├── index.js
│   │   ├── inquiry.routes.js
│   │   ├── property.routes.js
│   │   ├── report.routes.js
│   │   └── user.routes.js
│   ├── services/
│   │   ├── audit.service.js
│   │   ├── auth.service.js
│   │   ├── email.service.js
│   │   ├── image.service.js
│   │   ├── inquiry.service.js
│   │   └── property.service.js
│   └── utils/
│       ├── apiResponse.js
│       ├── fileValidator.js
│       └── regexEscape.js
├── tests/
│   ├── auth.test.js
│   ├── favorites-admin.test.js
│   ├── frontend.test.js
│   ├── inquiries.test.js
│   ├── properties.test.js
│   ├── setup.js
│   └── transformer.js
├── .env.example
├── .eslintrc.json
├── .gitignore
├── jest.config.js
└── package.json
```

---

## 5. Prerequisites

- **Node.js**: `v20.0.0` or higher (`v20 LTS` or `v24` supported).
- **npm**: `v10.0.0` or higher.
- **MongoDB**: MongoDB Server `v6.0+` locally, or a free MongoDB Atlas connection string.

---

## 6. Installation

Clone or open the repository directory:

```bash
cd "rental portal"
```

Install pinned dependencies:

```bash
npm install
```

Copy the environment template:

```bash
cp .env.example .env
```

---

## 7. Environment Variables

Configure your `.env` file according to the environment:

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `PORT` | Number | No | `5000` | Port for Express HTTP server |
| `NODE_ENV` | String | No | `development` | `development`, `production`, or `test` |
| `MONGODB_URI` | String | **Yes** | — | MongoDB connection string |
| `JWT_SECRET` | String | **Yes** | — | Secret string (minimum 32 characters) |
| `JWT_EXPIRES_IN` | String | No | `7d` | Token lifetime (e.g. `7d`, `24h`) |
| `ALLOWED_ORIGINS` | String | No | `http://localhost:5000` | Comma-separated CORS allowed origins |
| `TRUST_PROXY` | Boolean | No | `false` | Enable behind reverse proxies (Nginx/Render/Heroku) |
| `MODERATION_REQUIRED` | Boolean | No | `false` | If `true`, new listings require admin approval before publishing |
| `EMAIL_MODE` | String | No | `console` | `console` (dev only) or `smtp` |
| `SMTP_HOST` | String | In Prod | — | SMTP host address |
| `SMTP_PORT` | Number | In Prod | `587` | SMTP port |
| `SMTP_SECURE` | Boolean | In Prod | `false` | Use SSL/TLS |
| `SMTP_USER` | String | In Prod | — | SMTP username / address |
| `SMTP_PASS` | String | In Prod | — | SMTP password / app password |
| `SMTP_FROM` | String | In Prod | — | Formatted sender email |
| `CLOUDINARY_CLOUD_NAME` | String | In Prod | — | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | String | In Prod | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | String | In Prod | — | Cloudinary API secret |

---

## 8. MongoDB Local & Atlas Setup

### Local MongoDB
If running MongoDB locally via Homebrew or system service:
```bash
brew services start mongodb-community
```
Set in `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/rental_portal
```

### MongoDB Atlas Setup
1. Create a free M0 cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, create a user with read/write privileges.
3. Under **Network Access**, add IP `0.0.0.0/0` (or your server's static IP).
4. Select **Connect** → **Drivers** (Node.js) and copy the connection string.
5. In `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/rental_portal?retryWrites=true&w=majority
   ```

---

## 9. Development, Production & Test Commands

### Run in Development
```bash
npm run dev
```
Starts the server using `nodemon` at `http://localhost:5000`.

### Seed Sample Data (Development Only)
```bash
npm run seed
```
Creates sample Seekers, Owners, sample published listings across various cities (Seattle, Chicago, Austin), sample inquiries, and favorites. Refuses to run if `NODE_ENV=production`.

### Run All Automated Tests
```bash
npm test
```
Executes all 5 test suites (`auth`, `properties`, `inquiries`, `favorites-admin`, `frontend`) using `mongodb-memory-server` and JSDOM.

### Run Code Linter
```bash
npm run lint
```
Runs ESLint across the codebase.

### Start in Production Mode
```bash
npm start
```
Starts the production server (`node server/server.js`).

---

## 10. API Documentation

All API endpoints are prefixed with `/api/v1`.

### Response Envelope Standards
Success:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully."
}
```

Error:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validation failed.",
    "details": [{ "field": "price", "message": "Price cannot be negative." }]
  }
}
```

### Core Endpoints

#### Authentication
- `POST /api/v1/auth/register` — Register seeker or owner account.
- `POST /api/v1/auth/login` — Authenticate and receive `token` cookie.
- `POST /api/v1/auth/logout` — Clear session cookie.
- `POST /api/v1/auth/forgot-password` — Request password reset email / link.
- `POST /api/v1/auth/reset-password` — Submit new password with reset token.
- `GET /api/v1/auth/me` — Fetch current authenticated user.
- `PATCH /api/v1/auth/change-password` — Update password and invalidate other sessions.

#### Users
- `GET /api/v1/users/me` — Current user profile.
- `PATCH /api/v1/users/me` — Update name or phone.
- `GET /api/v1/users/me/favorites` — List saved properties.
- `GET /api/v1/users/me/inquiries` — List inquiries submitted by user.
- `PATCH /api/v1/users/me/inquiries/:id/cancel` — Cancel a pending inquiry.
- `GET /api/v1/users/me/properties` — List properties owned by user.

#### Properties
- `GET /api/v1/properties` — Public search (published only) with allowlisted filters.
- `GET /api/v1/properties/featured` — Featured listings.
- `GET /api/v1/properties/recent` — Recently added listings.
- `GET /api/v1/properties/:id` — Detailed listing view (sanitized owner info).
- `GET /api/v1/properties/:id/similar` — Similar listings.
- `POST /api/v1/properties` — Create draft property (Owner/Admin).
- `PATCH /api/v1/properties/:id` — Update listing (Owner/Admin).
- `DELETE /api/v1/properties/:id` — Soft archive listing (Owner/Admin).
- `POST /api/v1/properties/:id/publish` — Publish listing.
- `POST /api/v1/properties/:id/unpublish` — Unpublish listing.
- `POST /api/v1/properties/:id/images` — Upload listing photos (max 10).
- `DELETE /api/v1/properties/:id/images/:imageId` — Delete photo.
- `PATCH /api/v1/properties/:id/availability` — Update availability / mark rented or sold.
- `GET /api/v1/properties/:id/stats` — Owner listing engagement stats.

#### Favorites
- `POST /api/v1/properties/:id/favorite` — Save property (409 if duplicate).
- `DELETE /api/v1/properties/:id/favorite` — Remove from saved list.

#### Inquiries & Viewings
- `POST /api/v1/properties/:id/inquiries` — Submit inquiry or viewing request.
- `GET /api/v1/owner/inquiries` — List inquiries received by owner.
- `GET /api/v1/owner/inquiries/:id` — View single inquiry.
- `PATCH /api/v1/owner/inquiries/:id/status` — Owner accepts/rejects/completes inquiry.

#### Reports & Safety
- `POST /api/v1/properties/:id/reports` — Seeker flags a listing.
- `GET /api/v1/owner/reports` — Owner views reports on their listings.
- `PATCH /api/v1/owner/reports/:id/response` — Owner submits clarification response.
- `GET /api/v1/admin/reports` — Admin views all reports.
- `PATCH /api/v1/admin/reports/:id` — Admin resolves or dismisses report.

#### Admin
- `GET /api/v1/admin/dashboard` — Platform counters and stats.
- `GET /api/v1/admin/users` — User directory.
- `PATCH /api/v1/admin/users/:id/status` — Suspend or reactivate user account.
- `GET /api/v1/admin/properties` — Properties directory with moderation details.
- `PATCH /api/v1/admin/properties/:id/moderation` — Approve or reject listing with note.
- `DELETE /api/v1/admin/properties/:id` — Remove and archive prohibited listing.
- `GET /api/v1/admin/audit-logs` — Audit log trail.

#### Health Check
- `GET /health` or `GET /api/v1/health` — MongoDB connection and uptime check.

---

## 11. Admin Setup

Admins cannot register via the public registration endpoint. They are created exclusively via `scripts/createAdmin.js`.

### Non-Interactive via Environment Variables:
```bash
ADMIN_NAME="System Administrator" \
ADMIN_EMAIL="admin@rentalportal.com" \
ADMIN_PASSWORD="SecureAdminPassword123!" \
node scripts/createAdmin.js
```

### Interactive Prompt:
```bash
node scripts/createAdmin.js
```
The script will prompt securely for the administrator's name, email, and password.

---

## 12. Cloudinary Configuration

In production, Cloudinary is required for persistent CDN media hosting:
1. Sign up at [Cloudinary](https://cloudinary.com).
2. Copy your **Cloud Name**, **API Key**, and **API Secret** from the Dashboard.
3. Add them to `.env`:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
When `NODE_ENV=production`, the server verifies these credentials on startup and fails fast if they are missing. In development/testing, the built-in local disk adapter safely stores images in `uploads/`.

---

## 13. SMTP Configuration

In production, transactional emails (such as password resets) require valid SMTP credentials:
```env
EMAIL_MODE=smtp
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
SMTP_FROM="Rental Portal <noreply@rentalportal.com>"
```
In development mode (`NODE_ENV!=production`), setting `EMAIL_MODE=console` prints password reset links directly to the terminal marked with `[DEV ONLY]`.

---

## 14. Deployment Guide

### Deployment Architecture
- **Host:** Render, Railway, Heroku, or AWS EC2 running Node.js 20 LTS.
- **Database:** MongoDB Atlas M0/M10 cluster with automated backups.
- **Static & Media:** Express static serving with Helmet CSP; Cloudinary CDN for images.

### Step-by-Step Production Deployment (e.g. Render/Railway)
1. Link your Git repository.
2. Set Build Command: `npm install`
3. Set Start Command: `node server/server.js`
4. Set Environment Variables:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `TRUST_PROXY=true`
   - `MONGODB_URI=<Atlas Connection String>`
   - `JWT_SECRET=<32+ Character Random String>`
   - `ALLOWED_ORIGINS=https://your-domain.com`
   - `MODERATION_REQUIRED=true`
   - `EMAIL_MODE=smtp` + SMTP credentials
   - Cloudinary credentials
5. Health Check Path: `/health`
6. Run the admin creation script once via remote SSH or CLI console.

---

## 15. Troubleshooting

- **Server fails on startup with `Environment Validation Error`:**  
  Check your `.env` file. Ensure `JWT_SECRET` is at least 32 characters. In production, ensure SMTP and Cloudinary variables are provided.
- **CORS / CSRF Detected Error (403):**  
  State-changing requests (`POST`, `PATCH`, `DELETE`) require the `X-Requested-With: XMLHttpRequest` header (automatically added by `api.js`) and must match `ALLOWED_ORIGINS` or same-origin host.
- **Image upload rejected with `INVALID_IMAGE_TYPE`:**  
  Only genuine JPEG, PNG, or WebP files are accepted. Magic bytes are checked on the server buffer.
- **Viewing time slot conflict (409):**  
  An owner cannot accept a viewing appointment if another accepted viewing for the same property exists within ±60 minutes of the slot.

---

## 16. Limitations

- **No Online Payment Processing:** The portal intentionally does not handle payment processing, rent deposits, or wire transfers to reduce compliance risk.
- **No Document Signing:** Tenancy agreements and lease contracts must be signed offline.
- **Search Stemming:** MongoDB text indexes perform word tokenization and stemming. Substring searches within single tokens (e.g. searching "artm" for "apartment") require full word matching or the city filter.

---

## 17. Security Considerations

- **Strict Content-Security-Policy (CSP):** Inline `<script>` execution is forbidden by Helmet; all JavaScript is strictly modularized into external ES modules.
- **NoSQL Injection Protection:** Recursive key sanitizer strips any incoming query or body parameters containing `$` or `.`.
- **Payload Limits:** Strict 10 KB limit on JSON bodies to prevent memory exhaustion attacks.
- **Session Revocation:** Incrementing `user.tokenVersion` on password change revokes all active JWT cookies instantly across devices.
- **Mass Assignment Defense:** Create and update operations use strict allowlists—client inputs can never overwrite `role`, `status`, or `owner`.

---

## 18. Testing Guide

The test suite runs against an isolated, in-memory MongoDB database (`mongodb-memory-server`) to ensure tests never touch dev or production databases.

### Run All Tests:
```bash
npm test
```

### Test Coverage Highlights:
- **Authentication Suite (`tests/auth.test.js`):**
  Registration, duplicate email protection, password complexity enforcement, role escalation prevention (cannot register as admin), login verification, bad password rejection, suspended account immediate lockout (403), token revocation on password change, password reset token expiry, and cookie logout.
- **Properties Suite (`tests/properties.test.js`):**
  Creation, field validation, owner-only updates, unauthorized owner blocking, soft deletion archiving, publishing requirements (image, price, complete address), public search filtering, pagination, and sanitized owner information.
- **Inquiries Suite (`tests/inquiries.test.js`):**
  Inquiry creation, draft property rejection, self-inquiry prevention, duplicate pending blocking, owner accept/decline, seeker cancellation, and the ±60 minute viewing slot collision check (409).
- **Favorites & Admin Suite (`tests/favorites-admin.test.js`):**
  Favorite addition, duplicate handling (409), removal, admin route protection, listing moderation, user suspension, self/admin suspension prevention, profile role-escalation blocking, and audit log generation.
- **Frontend JSDOM Suite (`tests/frontend.test.js`):**
  Fetch API wrapper with credentials and CSRF headers, error normalization into `ApiError`, network failure handling, route guards redirection logic, safe HTML escaping, currency formatting, and accessible toast notifications.
