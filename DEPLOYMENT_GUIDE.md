# BazarChowk Ecosystem: Production Deployment Guide

This document outlines the enterprise-grade deployment strategy for the BazarChowk Hyperlocal Super App ecosystem. The architecture separates the persistence layer, the real-time NestJS API, the Next.js admin dashboards, and the React Native Expo mobile apps to ensure maximum scalability and zero downtime.

---

## 1. Persistence Layer (Database & Cache)
*The foundation. Deploy these first so the backend has connection URLs.*

### A. PostgreSQL Database (Relational Data)
- **Host Provider:** [Supabase](https://supabase.com/)
- **Why:** Supabase provides an optimized PostgreSQL instance with auto-scaling, daily automated backups, built-in connection pooling (pgBouncer), and a beautiful GUI to manually inspect your tables.
- **Deployment Steps:**
  1. Create a new organization and project on Supabase.
  2. Copy the **Transaction Connection String** (DATABASE_URL).
  3. In your local terminal, run `npx prisma db push` (or `npx prisma migrate deploy`) to construct all 50+ tables.

### B. Redis (Caching, Socket.io Adapter, BullMQ Queues)
- **Host Provider:** [Upstash](https://upstash.com/)
- **Why:** Upstash offers serverless Redis. You pay exactly per request, making it incredibly cheap to start, and it requires absolutely zero manual configuration.
- **Deployment Steps:**
  1. Create a global Redis database.
  2. Copy the **REDIS_URL** connection string.

---

## 2. The Brain (NestJS Backend & Socket Gateway)
*The core API. Must be hosted on a dedicated server to keep Socket.IO connections alive.*

- **Host Provider:** [Render.com](https://render.com/) or AWS EC2
- **Why:** Vercel/Netlify are "Serverless" and will kill your WebSockets and background Queues (BullMQ) after 10 seconds. Render provides an always-on, dedicated container perfect for NestJS.
- **Deployment Steps:**
  1. Push the `bazarchowk-backend` folder to a private GitHub repository.
  2. Connect Render to your GitHub account and create a new **Web Service**.
  3. **Build Command:** `npm install && npx prisma generate && npm run build`
  4. **Start Command:** `npm run start:prod`
  5. **Environment Variables:** Paste your `.env` file into the Render dashboard (ensure `DATABASE_URL`, `REDIS_URL`, `RAZORPAY`, `CLOUDINARY`, and `SENTRY` keys are included).

---

## 3. Web Dashboards (Next.js)
*The 4 Web interfaces: Partner, Market Admin, District Admin, and Super Admin.*

- **Host Provider:** [Vercel](https://vercel.com/)
- **Why:** Vercel created Next.js. It compiles your dashboards and instantly distributes them across their Global Edge Network, making load times lightning fast.
- **Deployment Steps:**
  1. Push your Next.js dashboard repositories to GitHub.
  2. Log into Vercel and click "Add New Project".
  3. Select your GitHub repository.
  4. Under Environment Variables, add `NEXT_PUBLIC_API_URL` and set it to your new Render.com backend URL (e.g., `https://bazarchowk-api.onrender.com`).
  5. Click Deploy.

---

## 4. Mobile Apps (Customer & Rider)
*The React Native Expo applications for iOS and Android.*

- **Host Provider:** Expo Application Services (EAS) ➔ App Stores
- **Why:** EAS compiles the raw Javascript into native iOS (`.ipa`) and Android (`.aab`) binaries in the cloud. You don't need a Macbook or Android Studio to build them.
- **Deployment Steps:**
  1. Install the EAS CLI locally: `npm install -g eas-cli`
  2. Login to your Expo account: `eas login`
  3. Configure your project: `eas build:configure`
  4. **Build Android:** `eas build -p android --profile production`
  5. **Build iOS:** `eas build -p ios --profile production`
  6. **OTA Updates:** If you need to push a quick UI fix later, run `eas update --branch production`. This pushes the code directly to users' phones without them needing to re-download the app from the Play Store!

---

## 5. Media & Monitoring

### A. Media Storage (Already Implemented)
- **Host Provider:** Cloudinary
- **Purpose:** Automatically hosts, crops, and compresses Product Images, Shop Logos, and Prescriptions into ultra-fast WebP formats.

### B. Error Tracking (Already Implemented)
- **Host Provider:** Sentry.io
- **Purpose:** If a payment fails or the API crashes, Sentry will instantly ping your phone with the exact file and line number that caused the crash.

---

## Final Pre-Launch Checklist

- [ ] Run `npx prisma generate` against the production database URL.
- [ ] Ensure all local `bazarchowk-complete.vercel.app` URLs in your frontend code are replaced with the live backend URL.
- [ ] Whitelist your live Vercel frontend domains in the backend's CORS configuration (in `src/main.ts`).
- [ ] Perform a test order (Add to Cart -> Checkout -> Rider Assignment) using the live production URLs to ensure real-time Sockets are connecting properly.
