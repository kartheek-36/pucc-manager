# RTO Pollution Van Manager

A high-performance, mobile-first fleet management and daily collection web application for an RTO pollution-testing business managing 3 mobile pollution testing vans (**Van 01**, **Van 02**, **Van 03**).

Built with a **Premium Clean White Business UI** (inspired by modern banking and fleet applications), **Next.js 16+ App Router**, **TypeScript**, **Tailwind CSS**, **PostgreSQL**, **Prisma ORM**, **Firebase Authentication**, **Firebase Cloud Messaging (FCM)**, and full **Progressive Web App (PWA)** mobile installability.

---

## 🌟 Upgraded Highlights & Design Direction

- ⚡ **Extreme Speed & Performance**:
  - Single consolidated server-side dashboard query returning today's collection, tests, van breakdown, weekly overview, and comparisons in one trip.
  - Non-blocking asynchronous FCM notification pipeline (submission completes in milliseconds without waiting on external push roundtrips).
  - PostgreSQL indexed lookups on `(van_id, report_date)`, `(report_date)`, `(operator_id, report_date)`, and `(status, report_date)`.
- ⚪ **Premium White Business UI**:
  - Pure `#FFFFFF` primary background and cards with 1px `#E7E9ED` borders.
  - Secondary surfaces in `#F7F8FA`, crisp `#111827` primary text, `#6B7280` secondary text, and solid professional `#1D4ED8` action buttons.
  - Generous whitespace, Apple-like spacing, and subtle 8–12px border radii.
- 📱 **Simple One-Hand Mobile Operation (320px – 430px)**:
  - Sticky bottom action buttons and fixed mobile bottom navigation.
  - Stepper controls `[ - ] [ count ] [ + ]` with 44px+ touch targets for Petrol, Diesel, and Other vehicles.
  - Daily report completed in under 30 seconds.
- 📊 **Executive Admin Dashboard (Instant 5-Second Comprehension)**:
  - Top Hero: Today's Collection with `+12.4% vs yesterday` comparison.
  - Metric row: Total Tests | Active Vans.
  - Today's Vans cards with status indicators (`● Submitted` / `● Pending`).
  - Weekly collection trend with week-over-week % and Van Rankings (1. Van 02, 2. Van 01, 3. Van 03).
  - Monthly overview with 5-metric cards, daily bars, and van comparisons.
- 🔔 **Multi-Channel Notification System**:
  - Real-time in-app notification inbox with unread counter badges on the notification bell.
  - Web Push notifications via Firebase Cloud Messaging (FCM) using Firebase Admin multicast.
  - Daily pending report detection cron job endpoint (`/api/cron/pending-reports`) protected by `CRON_SECRET` and scheduled after the 8:00 PM IST deadline with deduplication.
- 🛡️ **Enterprise Security & Regulatory Auditing**:
  - Server-side Firebase ID token verification and HTTP-only session cookies.
  - Immutable regulatory audit log (`AuditLog` table) recording `LOGIN`, `REPORT_SUBMITTED`, `REPORT_APPROVED`, `REPORT_REJECTED`, `USER_UPDATED`, and `VAN_UPDATED`.
  - Financial calculations enforced using `DECIMAL(12,2)` arithmetic (never floating point).
  - All financial deadlines and report dates anchored to Indian Standard Time (`Asia/Kolkata`).

---

## 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15+ App Router, React 19, TypeScript |
| **Styling** | Tailwind CSS with custom Indian RTO theme tokens |
| **Database** | PostgreSQL (Neon, Supabase, AWS RDS, or local PostgreSQL) |
| **ORM** | Prisma ORM with native `Decimal(12,2)` and `Timestamptz` |
| **Authentication** | Firebase Authentication (Email/Password) + Session Cookies |
| **Notifications** | Firebase Cloud Messaging (FCM), Firebase Admin SDK (`sendEachForMulticast`) |
| **Charts** | Recharts (Responsive bar, area, and line charts) |
| **Validation** | Zod + React Hook Form |
| **Export** | CSV generator + jsPDF with autoTable |
| **PWA** | Web App Manifest (`manifest.webmanifest`), `firebase-messaging-sw.js` |

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18+ or v20+ (tested on Node v24)
- **npm**: v9+
- Optional: PostgreSQL connection string (Neon or local)

### 2. Install Dependencies
```bash
npm install
```

### 3. Generate Prisma Client
```bash
npm run db:generate
# or: npx prisma generate
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 5. Run Database Migrations & Seed (PostgreSQL)
If using a live PostgreSQL database:
```bash
npx prisma migrate dev --name init
npm run db:seed
```
> *Note:* If running in standalone preview mode without an active PostgreSQL instance, the application automatically uses its integrated high-fidelity seed repository with 30 days of pre-populated data!

### 6. Run Automated Tests
```bash
npm test
```
Runs 31 automated acceptance tests covering calculations, RBAC, duplicate prevention, and notifications.

### 7. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 👥 Pre-Configured Test Accounts

The system includes 1 Head Admin and 3 Van Operators:

| Role | Name | Phone | Email | Password | Assigned Van |
|---|---|---|---|---|---|
| **ADMIN** | Venkateswara Rao | `7013669423` | `admin@rtovan.com` | `7013669423@p` | All Vans (Fleet Owner) |
| **VAN_OPERATOR** | umamaheswara | `9951537362` | `van1@rtovan.com` | `password123` | **umamaheswara** (`MH-12-PUC-1001`) |
| **VAN_OPERATOR** | srisai | `9951536848` | `van2@rtovan.com` | `password123` | **srisai** (`MH-12-PUC-1002`) |
| **VAN_OPERATOR** | srivenkateswara | `9951537681` | `van3@rtovan.com` | `password123` | **srivenkateswara** (`MH-12-PUC-1003`) |

---

## 📋 Complete Firebase Setup Guide

Follow these steps to configure your production Firebase Authentication and Firebase Cloud Messaging:

### Step 1: Create Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and name it `rto-pollution-van-manager`.
3. Disable Google Analytics (optional) and click **Create Project**.

### Step 2: Enable Authentication
1. In the left navigation, select **Build > Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, click **Email/Password**.
4. Enable the first toggle (**Email/Password**) and click **Save**.

### Step 3: Add Web App
1. Go to **Project Settings** (gear icon in sidebar).
2. Under **General > Your apps**, click the **Web (</>)** icon.
3. App nickname: `RTO Van Manager Web`.
4. Check **Also set up Firebase Hosting** (optional) and click **Register app**.
5. Copy the `firebaseConfig` keys into your `.env.local`:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

### Step 4: Configure Cloud Messaging & Web Push (VAPID Key)
1. In Firebase Console, open **Project Settings > Cloud Messaging**.
2. Under **Web configuration > Web Push certificates**, click **Generate key pair**.
3. Copy the generated Key string into:
   ```env
   NEXT_PUBLIC_FIREBASE_VAPID_KEY="YOUR_GENERATED_VAPID_KEY"
   ```

### Step 5: Generate Firebase Admin Service Account
1. In Firebase Console, go to **Project Settings > Service accounts**.
2. Select **Node.js** and click **Generate new private key**.
3. Open the downloaded JSON file and map the values to your `.env.local`:
   ```env
   FIREBASE_PROJECT_ID="your-project-id"
   FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com"
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

---

## 🗄️ PostgreSQL Setup (Neon or Supabase)

### Using Neon.tech (Recommended)
1. Sign up at [neon.tech](https://neon.tech) and create a project called `rto-van-manager`.
2. Copy the Connection String into `.env.local`:
   ```env
   DATABASE_URL="postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```
3. Run the Prisma migration:
   ```bash
   npx prisma migrate dev --name init
   npm run db:seed
   ```

### Raw PostgreSQL SQL Migration Equivalent
If applying migrations directly with `psql` or Supabase SQL Editor:
The complete PostgreSQL migration script is available at:
[`prisma/migrations/0_init/migration.sql`](prisma/migrations/0_init/migration.sql)

It creates:
- `UUID` primary keys with `uuid-ossp`
- PostgreSQL `ENUM` types: `Role`, `VanStatus`, `ReportStatus`
- `DECIMAL(12, 2)` columns for money
- Foreign key constraints and unique constraint `(van_id, report_date)`
- Complete performance indexes

---

## ⏰ Scheduled Pending Report Cron Setup

To notify the Admin when a van has not submitted by **8:00 PM IST (20:00)**:

### Endpoint
```http
POST /api/cron/pending-reports?secret=rto_cron_secret_key_2026
```
or via Header:
```http
Authorization: Bearer rto_cron_secret_key_2026
```

### Free Automated Cron Scheduling (Vercel Cron or cron-job.org)
In `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/pending-reports?secret=rto_cron_secret_key_2026",
      "schedule": "30 14 * * *"
    }
  ]
}
```
*(14:30 UTC corresponds to 20:00 / 8:00 PM IST).*

---

## 📱 Progressive Web App (PWA) on Mobile

1. Open the website on your phone (Chrome on Android or Safari on iOS).
2. Chrome will prompt or show the **Install App** badge in the header.
3. Tap **Install PWA App** or **Add to Home screen**.
4. The application installs as a standalone app with its dedicated app icon, splash screen, and full-screen view without browser address bars.

---

## 🔄 Complete Data Flow Explanation

1. **Operator Login**: Van 01 Operator signs in. Session cookie is set and verified on the server.
2. **Dashboard Loading**: Operator sees today's shift date in IST, assigned van info, and submission form.
3. **Report Submission**:
   - Operator enters Petrol, Diesel, and Other test counts + Total collection and expenses.
   - Client and Server validate category sum equality and non-negative values.
   - Server validates unique constraint `(van_id, report_date)` preventing duplicates.
   - Report is saved in PostgreSQL with `DECIMAL(12,2)` precision.
4. **Instant Admin Notification**:
   - In-app notification record is inserted into `notifications` table.
   - Firebase Admin SDK dispatches multicast web push to all active Admin device tokens.
   - Audit log `REPORT_SUBMITTED` is immutably recorded.
5. **Admin Review & Approval**:
   - Admin opens notification bell or dashboard.
   - Clicks on the submission to view breakdown (`/admin/reports/[id]`).
   - Admin clicks **Approve Report**; status updates to `APPROVED` and locks further operator edits.
6. **Data Export**:
   - Admin filters reports by Date Range / Van on `/admin/reports` and clicks **Export CSV** or **Export PDF**.

---

## 📦 Production Deployment (Vercel)

1. Push your repository to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add the environment variables from `.env.example`.
4. Deploy! Vercel automatically detects Next.js 15+ App Router and builds the production bundle.
