# Environments & Deployment Foundation

> **Milestone 1 Deliverable** — Development, staging, and production environments plus the CI/CD deployment foundation for The Recruiting Standard.

---

## 1. Environment Model

The platform runs three isolated environments. Each environment has its own database, storage bucket, credentials, and hosting target. **No environment ever shares a database or storage bucket with another.**

| Environment | Purpose | Branch | Client hosting | API hosting | Database | Storage |
|---|---|---|---|---|---|---|
| **Development** | Local feature work | any feature branch | `next dev` (localhost:3000) | `tsx watch` (localhost:5000) | Local PostgreSQL or Neon dev branch | Local mock / dev S3 bucket |
| **Staging** | Client review & QA | `develop` | Vercel Preview/Staging | Render staging service | Neon staging branch | S3 staging bucket (private) |
| **Production** | Live platform | `main` | Vercel Production | Render production service | Neon production | S3 production bucket (private) |

### Branch-to-environment mapping

```
feature/*  ──PR──▶  develop  ──merge──▶  main
   │                  │                   │
 local dev        staging deploy      production deploy
```

- Pull requests run CI only (lint, test, build) — never deploy.
- Merges to `develop` deploy to **staging**.
- Merges to `main` deploy to **production**.
- Production requires a passing CI run and GitHub Environment approval.

---

## 2. Environment Variable Matrix

### API (`server/`)

| Variable | Development | Staging | Production | Required |
|---|---|---|---|---|
| `NODE_ENV` | `development` | `staging` | `production` | Yes |
| `PORT` | `5000` | provider-assigned | provider-assigned | Yes |
| `CLIENT_ORIGIN` | `http://localhost:3000` | staging site URL | production site URL | Yes |
| `DATABASE_URL` | local/dev Neon branch | Neon staging branch | Neon production | Yes |
| `JWT_SECRET` | dev-only value | staging secret | production secret | Yes |
| `JWT_EXPIRES_IN` | `7d` | `7d` | `7d` | No |
| `REDIS_URL` | optional | staging Redis | production Redis | No |
| `STORAGE_BUCKET` | optional | staging bucket | production bucket | Yes (non-dev) |
| `STORAGE_REGION` | optional | staging region | production region | Yes (non-dev) |
| `STORAGE_ACCESS_KEY_ID` | optional | staging key | production key | Yes (non-dev) |
| `STORAGE_SECRET_ACCESS_KEY` | optional | staging secret | production secret | Yes (non-dev) |
| `STORAGE_SIGNED_URL_TTL_SECONDS` | `900` | `900` | `900` | No |
| `SMTP_*` / `EMAIL_FROM` | optional | staging sender | production sender | Yes (non-dev) |

### Client (`client/`)

| Variable | Development | Staging | Production | Required |
|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | staging URL | `https://therecruitingstandard.com` | Yes |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api/v1` | staging API URL | production API URL | Yes |

> **Rule:** `NEXT_PUBLIC_*` variables are public and must never contain secrets. All secrets live only in the API environment.

---

## 3. Local Development Setup

```powershell
# 1. API
Copy-Item server\.env.example server\.env
npm --prefix server install
npm --prefix server run prisma:generate
npm --prefix server run prisma:migrate
npm --prefix server run seed
npm --prefix server run dev

# 2. Client (separate terminal)
Copy-Item client\.env.example client\.env.local
npm --prefix client install
npm --prefix client run dev
```

- Client: http://localhost:3000
- API health: http://localhost:5000/health
- API base: http://localhost:5000/api/v1

---

## 4. Secrets Management

- Local secrets live only in untracked `.env` / `.env.local` files.
- Staging and production secrets are stored in the host's encrypted secret store (Render Environment Group) and GitHub Environment secrets.
- Secrets are never committed, printed in logs, or exposed to the client bundle.
- Rotate `JWT_SECRET` and storage credentials on suspected exposure. Rotating `JWT_SECRET` invalidates all sessions.
- Each environment uses **separate** database and storage credentials; a staging credential must not be able to reach production data.

---

## 5. Database Migration Policy

- Migrations are committed to `server/prisma/migrations/` and are the single source of truth for schema changes.
- **Never** use `prisma db push` against staging or production.
- Migrations are applied with `prisma migrate deploy` by the CD pipeline's `migrate` job before the API is deployed.
- Staging receives every migration before production.
- Migrations must be forward-only and backward-compatible until the previous release is fully retired.

```powershell
# Create a migration locally
npm --prefix server run prisma:migrate -- --name <change_name>

# Apply committed migrations (CI/CD, staging, production)
npm --prefix server run prisma:deploy
```

---

## 6. CI/CD Foundation

| Workflow | File | Trigger | Actions |
|---|---|---|---|
| Continuous Integration | `.github/workflows/ci.yml` | PR / push to `main`, `develop` | Server generate + test + build, client lint + build, Prisma schema validate |
| Continuous Deployment | `.github/workflows/deploy.yml` | push to `develop` / `main`, manual dispatch | Apply migrations, deploy API (Render), deploy client (Vercel) |

Required GitHub **Environment** secrets:

| Secret | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | migrate job | Target environment database |
| `RENDER_DEPLOY_HOOK_URL` | deploy-api job | Triggers the Render deploy |
| `VERCEL_TOKEN` | deploy-client job | Vercel CLI authentication |
| `VERCEL_ORG_ID` | deploy-client job | Vercel scope |
| `VERCEL_PROJECT_ID` | deploy-client job | Vercel project |

Create two GitHub Environments — `staging` and `production` — and configure the secrets per environment. Protect `production` with required reviewers.

---

## 7. Provider Selection Summary

| Component | Provider | Notes |
|---|---|---|
| Public site | Vercel | Next.js 16 App Router, project root `client/` |
| API | Render (Docker) | `server/Dockerfile`, health check `/health`, deploy triggered by hook after migrations |
| Database | Neon PostgreSQL | Separate branch per environment, pooled connection string |
| Private storage | AWS S3 | Block All Public Access, signed URLs only |
| Email | Resend / SMTP | Provider credentials injected per environment |

Estimated running costs are documented in `docs/ARCHITECTURE.md` §6.
