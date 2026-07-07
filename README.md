# 🌈 BazarChowk Platform (bazarchowk.com)

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Hyperlocal%20Commerce-ff6b35?style=for-the-badge" alt="Platform Badge" />
  <img src="https://img.shields.io/badge/Architecture-Monorepo-4c6fff?style=for-the-badge" alt="Architecture Badge" />
  <img src="https://img.shields.io/badge/Apps-5%20Core%20Apps-00b894?style=for-the-badge" alt="Apps Badge" />
</p>

BazarChowk is a **hyperlocal commerce + services platform** built for small cities and neighborhoods.  
It connects **customers**, **shop partners**, **delivery riders**, and **admins** in one ecosystem to discover nearby stores/services, place orders, and get live delivery updates.

This repository is the complete multi-app codebase that powers the BazarChowk experience.

---

## ✨ What BazarChowk Does

- 🛍️ **Local shopping:** browse categories, shops, and products from nearby markets.
- 🧾 **Order management:** add to cart, checkout, track status, and view history.
- 🧰 **Service bookings:** appointment and service flows beyond standard delivery.
- 💳 **Payments & wallets:** online payments, transaction tracking, and wallet support.
- 🏪 **Partner operations:** onboarding, inventory, products, documents, timings, and order handling.
- 🛵 **Rider operations:** delivery assignment, status updates, and order fulfillment.
- 📊 **Admin control:** analytics, categories, shops, products, inventory, orders, and notifications.
- 🤖 **AI-assisted flows:** AI assistant and voice-order related modules.

---

## 🧱 Platform Architecture

BazarChowk is a monorepo with **5 main applications**:

| App | Stack | Purpose |
|---|---|---|
| `bazarchowk-backend` | NestJS + Prisma + PostgreSQL + Redis | Central API and business logic |
| `bazarchowk-customer` | Expo / React Native + Expo Router | Customer browsing, ordering, wallet, profile |
| `bazarchowk-partner` | Expo / React Native + Expo Router | Merchant onboarding and store operations |
| `bazarchowk-rider` | Expo / React Native + Expo Router | Rider delivery workflow and profile actions |
| `bazarchowk-admin` | Next.js | Admin dashboards, controls, and supervision |

### 🔐 Backend responsibilities (`bazarchowk-backend`)
- Authentication, authorization, and user profiles
- Product/catalog and inventory management
- Cart, order lifecycle, and delivery workflows
- Payments, billing, settlement, commissions, and finance
- Notifications, analytics, support, fraud/security, and monitoring
- Real-time communication with Socket.IO
- API documentation via Swagger at `/api/docs`

---

## 🧪 Technology Stack

- **Backend:** NestJS, Prisma, PostgreSQL, Redis (BullMQ), Swagger  
- **Frontend (Admin):** Next.js, React  
- **Mobile Apps:** Expo, React Native, Expo Router  
- **Realtime:** Socket.IO  
- **Integrations:** Razorpay, Cloudinary, Firebase Admin, Nodemailer

---

## 🗂️ Repository Structure

```text
bazarchowk-complete/
├── bazarchowk-backend/   # API + core platform logic
├── bazarchowk-customer/  # Customer app
├── bazarchowk-partner/   # Partner app
├── bazarchowk-rider/     # Rider app
└── bazarchowk-admin/     # Admin dashboard
```

---

## 🔄 How the System Works (High-level)

1. Customer app requests products/services from nearby shops.
2. Backend validates user, market context, inventory, offers, and pricing.
3. Order is created and payment state is managed.
4. Partner app receives order updates and processes fulfillment.
5. Rider app handles pickup and delivery updates.
6. Customer and admin panels receive real-time status updates and notifications.
7. Finance/commission/settlement modules reconcile platform and partner economics.

---

## 🚀 Local Development Setup

> Run each app independently in its own terminal.

### ✅ Prerequisites

- Node.js (LTS recommended)
- npm
- PostgreSQL
- Redis

### Backend

```bash
cd /home/runner/work/bazarchowk-complete/bazarchowk-complete/bazarchowk-backend
npm install
npm run start:dev
```

Useful backend commands:
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run test:e2e`

### Customer App

```bash
cd /home/runner/work/bazarchowk-complete/bazarchowk-complete/bazarchowk-customer
npm install
npm run start
```

### Partner App

```bash
cd /home/runner/work/bazarchowk-complete/bazarchowk-complete/bazarchowk-partner
npm install
npm run start
```

### Rider App

```bash
cd /home/runner/work/bazarchowk-complete/bazarchowk-complete/bazarchowk-rider
npm install
npm run start
```

### Admin Panel

```bash
cd /home/runner/work/bazarchowk-complete/bazarchowk-complete/bazarchowk-admin
npm install
npm run dev
```

---

## ⚙️ Environment Notes

At minimum, the backend expects infrastructure values such as:
- `DATABASE_URL` (PostgreSQL)
- `REDIS_URL` (Redis)
- `PORT`

Admin and apps typically use API base URL variables (for example `NEXT_PUBLIC_API_URL` in admin).

---

## 📣 Landing Page / Website Positioning Copy (bazarchowk.com)

If you are writing content for **bazarchowk.com**, a concise positioning statement can be:

> **BazarChowk is a local-first super app that brings neighborhood shopping, services, merchants, and last-mile delivery into one trusted digital marketplace.**

Suggested value points for landing sections:
- **For Customers:** faster local delivery, trusted nearby sellers, simple ordering.
- **For Merchants:** digital storefront, inventory/order tools, wider local reach.
- **For Riders:** delivery opportunities with live task tracking.
- **For Admins/Operators:** centralized control, analytics, and operational visibility.

---

## 📌 Status

This repository contains production-oriented modules across commerce, logistics, finance, communication, and platform operations, organized for multi-role execution (customer, partner, rider, admin).
