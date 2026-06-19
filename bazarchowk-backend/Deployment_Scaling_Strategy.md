# Deployment and Scaling Strategy

## 1. Containerization & Orchestration
- **Docker:** The NestJS backend and Prisma client are containerized using a multi-stage `Dockerfile` to keep the production image lightweight.
- **Orchestration:** Deployed on **DigitalOcean App Platform** or Kubernetes depending on scale.

## 2. CI/CD Pipeline
- **GitHub Actions:**
  - On Push: Run ESLint, Jest unit and e2e tests.
  - On Merge to Main: Build Docker image, push to GitHub Container Registry (GHCR) or Docker Hub.
  - Apply Prisma migrations (`npx prisma migrate deploy`) during the CI/CD pipeline before releasing the new image.

## 3. Database Scaling (PostgreSQL)
- **Phase 1 (0-1,000 requests/min):** Single managed PostgreSQL instance with SSD storage. Prisma connection pooling configured (`connection_limit=10`).
- **Phase 2 (1,000+ requests/min):** 
  - Add **PgBouncer** to manage a higher number of connections.
  - Setup **Read Replicas** for heavy GET requests (catalog, addresses, profiles).
  - Use Prisma Accelerate for edge caching if global distribution is needed.

## 4. Application Caching (Redis)
- Implement Redis for caching frequent non-mutable reads (e.g., categories, active promotions).
- Session tokens and refresh token validation can be offloaded to Redis to reduce database hits on every protected route.

## 5. Background Jobs (BullMQ)
- Use **BullMQ** (backed by Redis) to handle asynchronous tasks off the main Node.js event loop:
  - Sending push notifications via FCM.
  - Dispatching emails via SES.
  - Order assignment algorithms.

## 6. Observability
- **Sentry:** For tracking unhandled exceptions and performance bottlenecks.
- **PostHog:** To track user flows and feature usage.
- **Prometheus/Grafana:** For monitoring server metrics (CPU, Memory, Request Latency).
