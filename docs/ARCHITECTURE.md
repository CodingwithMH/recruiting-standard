# System Architecture & Technical Specifications — The Recruiting Standard

> **Document Version:** 1.0.0 (MVP 4.18 Release)  
> **Status:** Agreed & Validated Architecture  
> **Target System:** The Recruiting Standard School Athletic Recruiting Platform  

---

## 1. System Vision & Overview

The Recruiting Standard is an institutional-grade school athletic recruiting platform built to eliminate recruiting noise, social posturing, and unverified data. It establishes an authoritative, high-trust environment where school athletic departments, vetted coaching staffs, student-athletes, and families operate under strict privacy controls.

The platform operates across two complementary surfaces sharing a single monorepo and a unified database:

```
recruiting-standard/
├── client/                     # Next.js 16 (App Router, React 19, Tailwind CSS v4)
│   ├── app/
│   │   ├── (public)/           # High-trust marketing pages & public registration
│   │   ├── sitemap.ts          # Automated SEO sitemap generator
│   │   └── robots.ts           # Search crawler directives
│   └── components/             # Reusable UI primitives & section blocks
│
├── server/                     # Express 5 REST API (Node.js LTS, TypeScript)
│   ├── src/
│   │   ├── config/             # Zod environment validation & Prisma connection
│   │   ├── middleware/         # Security headers, rate limiting, error handler
│   │   ├── routes/             # Health checks, API v1 endpoints
│   │   └── utils/              # Structured logger
│   └── prisma/
│       └── schema.prisma       # 8 core domain models & PostgreSQL schema
│
├── docs/
│   └── ARCHITECTURE.md         # This technical specification document
└── .github/workflows/
    └── ci.yml                  # Continuous integration & test pipeline
```

---

## 2. School-Level Data Isolation Approach (Strict Multi-Tenancy)

### Tenancy Model
The platform adopts a **logical multi-tenancy model with strict programmatic tenant isolation** inside a single PostgreSQL database. All institutional records (coach watchlists, internal evaluations, contact records, offers, and subscriptions) are anchored to a specific `schoolId`.

### Permanent School ID Sovereignty
- When a high school registers on the public website, its initial status is `PENDING`.
- A pending school has **zero access** to the recruiting portal.
- Upon Platform Admin verification and approval:
  - The school is assigned a permanent, unique, immutable identifier (e.g. `SCH-10492`).
  - This `SchoolID` is permanently sovereign: it is never modified, re-issued, or reused, even if a school changes athletic directors or suspends its account.
  - All institutional recruitment history is permanently anchored to this identifier.

### Multi-Layer Tenant Enforcement
Tenant boundaries are strictly enforced across two server-side defense layers. Client-side UI hiding is never trusted.

```
Incoming Request
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Server Authentication & Role Guards                │
│ • Validates cryptographic JWT session signature             │
│ • Loads User record and active SchoolMembership             │
│ • Rejects cross-school access attempts with 403 Forbidden    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: ORM Query Scoping (Prisma)                         │
│ • Enforces mandatory `schoolId` filter on every query       │
│ • Example: `prisma.recruitingRecord.findMany({              │
│     where: { id: recordId, schoolId: req.user.schoolId }    │
│   })`                                                       │
│ • Guarantees School A cannot read or write School B data    │
└─────────────────────────────────────────────────────────────┘
```

1. **Layer 1: JWT & Membership Verification Middleware:**
   - Every authenticated request requires a valid JWT bearer token.
   - The token identifies the user and their active `SchoolMembership`.
   - The server verifies that the user's membership status is `ACTIVE` and maps their `schoolId` to the request context (`req.schoolId`).
   - If a coach from School A attempts to target an endpoint parameterized with School B's identifier, the middleware halts execution with `403 Forbidden`.

2. **Layer 2: Database Query Scoping (Prisma ORM):**
   - Every database query touching `RecruitingRecord`, `SavedProspect`, or `Subscription` requires the tenant key in its `where` clause:
     ```typescript
     // Safe: Scoped to the authenticated school tenant
     const records = await prisma.recruitingRecord.findMany({
       where: {
         schoolId: req.schoolId, // Injected by verified server middleware
         athleteProfileId: athleteId,
       },
     });
     ```
   - Because `schoolId` is injected strictly from the verified session context (never trusted from URL query parameters or client request bodies), accidental or malicious cross-tenant leakage is mathematically impossible.

---

## 3. Private Document Storage Architecture (Zero Public URLs)

Student-athletes upload sensitive records including academic transcripts, standardized test reports, physical exam waivers, and combine metrics. These documents are subject to strict privacy rules.

### Core Non-Negotiable Document Rules
1. **Zero Public URLs:** The cloud storage bucket is configured with **Block All Public Access**. No object has a public URL.
2. **Short-Lived Signed URLs:** Read and write access is granted exclusively through time-limited, cryptographically signed URLs (10–15 minute expiration).
3. **No Direct Server File Handling:** Files are uploaded directly from the client to object storage using presigned upload URLs, reducing server memory load and eliminating attack vectors.

### Document Upload Workflow
```
[Athlete Client]                [Express API Server]              [Private Cloud Storage]
       │                                  │                                  │
       │── 1. POST /documents/upload ────>│                                  │
       │   (filename, mime, size, type)   │                                  │
       │                                  │── 2. Validate athlete role & ───>│
       │                                  │      Generate Presigned PUT      │
       │<─ 3. Return Presigned URL ───────│      (10 min expiry)             │
       │      & private storageKey        │                                  │
       │                                  │                                  │
       │── 4. PUT file directly to Storage Bucket ──────────────────────────>│
       │                                  │                                  │
       │── 5. POST /documents/confirm ───>│                                  │
       │   (saves Document record with    │                                  │
       │    status: PENDING)              │                                  │
       ▼                                  ▼                                  ▼
```

### Document Retrieval & Access Control
When an authorized user requests to view a document:
1. The user requests `GET /api/v1/documents/:id/access`.
2. The server verifies access authorization:
   - **Allowed:** Document owner (Athlete) or linked parent.
   - **Allowed:** Platform Administrator (for verification queue).
   - **Allowed:** Verified Coach whose school possesses an `ACTIVE` subscription AND the athlete's profile is in `APPROVED` status.
   - **Denied:** Any unverified user, cross-school snooper, or school with an expired subscription (`403 Forbidden`).
3. The server calls the cloud storage SDK to generate a temporary `GET` signed URL valid for **15 minutes**.
4. The client receives the temporary URL and opens the document in an authenticated viewer. The URL expires immediately after the viewing window.

---

## 4. User Roles & Permission Hierarchy

| Role | Scope | Key Capabilities |
|---|---|---|
| **Platform Admin** | Platform-Wide | Review and approve/reject registering schools; assign permanent `SchoolID`; review student transcripts and verification queue; administer manual school subscriptions ($1,500/yr or $250/mo); system health metrics. |
| **School Admin** | Own School Only | Manage institutional profile, invite/revoke coach and recruiter accounts, view school dashboard, review subscription status. |
| **Coach / Recruiter** | Own School Only | Search approved athletes; save prospect watchlists; maintain school-private recruiting logs, evaluation notes, and offer statuses. |
| **Athlete** | Own Profile Only | Build multi-sport athletic and academic profile; upload transcripts and combine reports; monitor verification status badge (`Unverified`, `Pending`, `Approved`). |
| **Parent / Guardian** | Linked Athlete Only | View linked athlete profile, monitor verification progress, oversee recruiting interactions in compliance with youth privacy standards. |

---

## 5. Subscription & Entitlement Architecture

### Business Model (from Developer Brief)
- **Annual Plan:** \$1,500 / year per school.
- **Monthly Plan:** \$250 / month per school.
- **Payment Method:** Collected and administered manually by the platform owner outside the platform during MVP.

### Data Model & Access Control Logic
- Every `Subscription` record is linked 1-to-1 with a `School` through its permanent `SchoolID`.
- Fields: `plan`, `paymentStatus` (`PAID`, `PENDING`, `OVERDUE`, `WAIVED`), `state` (`ACTIVE`, `SUSPENDED`, `CANCELLED`, `EXPIRED`), `startDate`, `expirationDate`, and manual invoice notes.
- **Server-Side Access Gating:**
  - When a school's coaching staff accesses recruiting search or talent records, server middleware checks:
    ```typescript
    if (school.subscription?.state !== 'ACTIVE' || (school.subscription.expirationDate && school.subscription.expirationDate < new Date())) {
      return res.status(402).json({
        error: 'Subscription Required',
        message: 'Your school recruitment subscription is inactive or expired. Please contact your Athletic Director or Platform Admin.',
      });
    }
    ```
  - This ensures that access control is enforced in server logic, not simply by disabling UI buttons.
- **Future Automated Billing Compatibility:** The `Subscription` entity schema contains all required timestamps, plan tiers, and status enumerations to seamlessly integrate Stripe or automated webhooks in later releases without database redesign.

---

## 6. Provider Selection & Estimated Running Costs

To deliver high availability, enterprise data isolation, and low operational overhead, the following managed infrastructure providers are recommended:

### Recommended Technology & Provider Matrix

| Infrastructure Component | Recommended Provider | Alternative Provider | Selection Rationale |
|---|---|---|---|
| **Frontend Application** | **Vercel** | AWS Amplify / Cloudflare Pages | First-class Next.js 16 App Router support, automatic edge optimization, zero devops overhead. |
| **Backend REST API** | **Railway** or **Render** | AWS ECS / App Runner | Isolated container execution, automatic zero-downtime deploys, native environment secret management, low maintenance. |
| **PostgreSQL Database** | **Neon Database** | Supabase / AWS RDS | Serverless PostgreSQL with instantaneous connection pooling, point-in-time recovery, zero-cold-start compute scaling. |
| **Private Object Storage** | **AWS S3** | Cloudflare R2 / Google Cloud Storage | Industry standard for secure signed URLs, block public access policies, and encrypted document storage. |
| **Transactional Email** | **Resend** | SendGrid / Postmark | Clean developer API, high inbox deliverability for verification codes and school approval alerts. |

---

### Estimated Running Cost Breakdown (Shared with Client)

| Stage | Service | Provider Tier | Estimated Cost / Month |
|---|---|---|---|
| **Development & Staging** | Frontend | Vercel Hobby / Pro | \$0 – \$20 / mo |
| | Backend API | Railway / Render Starter | \$5 – \$10 / mo |
| | Database | Neon PostgreSQL (Free / Launch) | \$0 – \$19 / mo |
| | Storage | AWS S3 (Pay-as-you-go, < 10 GB) | \$0.50 – \$2 / mo |
| | Email | Resend (Free tier, 3,000 emails/mo) | \$0 / mo |
| | **Staging Total** | | **\$5.50 – \$51.00 / mo** |
| **Production MVP Launch** | Frontend | Vercel Pro | \$20 / mo |
| | Backend API | Railway / Render Pro (Dedicated compute) | \$20 – \$35 / mo |
| | Database | Neon PostgreSQL Pro (High availability) | \$19 – \$40 / mo |
| | Storage | AWS S3 + Data Transfer | \$5 – \$15 / mo |
| | Email | Resend Growth Tier | \$20 / mo |
| | **Production MVP Total** | | **\$84.00 – \$130.00 / mo** |
| **Scale (100+ Schools)** | Comprehensive Infrastructure | Managed Scale Compute & Storage | **\$180 – \$320 / mo** |

*Note: Domain registration (\$12–\$15/year) is paid annually by the client.*

---

## 7. Public Website Sitemap & Search Directives

All 8 core public marketing and intake routes are indexed and mapped via dynamic App Router generators:

- **Root Homepage:** `/` (Brand identity, value proposition, feature overview, FAQ)
- **About:** `/about` (Mission, varsity athletics comparison cards, trust model)
- **Features / How It Works:** `/features` (School recruiting workflow, verification engine, coach tools)
- **Pricing:** `/pricing` (\$1,500 annual / \$250 monthly cards, procurement steps)
- **School Registration:** `/school-registration` (Institutional intake, 3-step verification timeline)
- **Contact:** `/contact` (Support inquiry form, response timeline)
- **Login Portal:** `/login` (Role-based entrance to the recruiting portal)
- **Legal Compliance:** `/privacy-policy` & `/terms` (Student privacy & FERPA/COPPA compliance safeguards)

Dynamic Sitemap endpoint: `/sitemap.xml`  
Crawler directivies: `/robots.txt` (Excludes private `/portal/`, `/admin/`, and `/api/` paths)

