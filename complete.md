# AI Task Runner — complete phase reference (1–5)

This document summarizes **all phases**: what each phase is for, what is **implemented** (Phases 1–3), and what is **planned** (Phases 4–5). It is a single roadmap-style overview; detailed runbooks may live elsewhere in the repo.

---

## Project purpose

**AI Task Runner** is a full-stack platform where users submit **long-running AI tasks** (summarise, transcribe, generate images, translate) and receive results **asynchronously**. The HTTP API returns quickly; **BullMQ** on **Redis** runs work in **worker processes**; **PostgreSQL** stores jobs; **Socket.io** (with Redis pub/sub) pushes live status to the web app.

---

## Tech stack (current)

| Layer | Technology |
|--------|------------|
| API | Node.js, Express, Zod |
| Queue | BullMQ on Redis 7+ |
| Database | PostgreSQL 16+, Prisma ORM |
| Real-time | Socket.io + Redis pub/sub (`job:updates`) |
| Frontend | React, Vite, TanStack Query, React Router |
| Auth | JWT (httpOnly cookie + optional Bearer), bcrypt |
| AI | **Google Gemini** (chat, image, transcription) |
| Object storage | Cloudinary (raw uploads for PDF/audio) |
| Local infra | Docker Compose (Postgres + Redis) |
| Monorepo | npm workspaces (`apps/*`, `packages/*`) |

---

# Phase 1 — Foundation

## Goals

- Run **PostgreSQL** and **Redis** locally (Docker Compose).
- **Prisma** schema, migrations, and a single `DATABASE` URL for API and worker.
- **JWT authentication**: register, login, logout, `GET /me`, plan upgrade stub.
- **Jobs**: create job rows, enqueue **BullMQ** jobs on queue **`ai-tasks`**, worker consumes and updates Postgres.
- **`GET /health`**: Postgres + Redis probes.
- **Feature-based API layout** (`modules/auth`, `modules/jobs`, `core/`).
- **ESM** TypeScript, shared package `@ai-task-runner/shared`, repo-root `.env` loading.

## Delivered

| Area | What exists |
|------|-------------|
| Auth | `POST /api/auth/register`, `login`, `logout`, `GET /api/auth/me`, `PATCH /api/auth/upgrade`; cookie `access_token`; `requireAuth` supports cookie or Bearer. |
| Jobs | `POST /api/jobs`, `GET /api/jobs`, `GET /api/jobs/:id`, `DELETE` (cancel pending), `POST .../retry` (retry failed); default queue per user; BullMQ `jobId` aligned with DB job id where configured. |
| Worker | BullMQ `Worker` on **`ai-tasks`**; sets job `active` → `completed` (early phases used placeholder `result`; superseded by real processors in 2–3). |
| Infra | `core/lib/prisma.ts`, `core/lib/redis.ts`; `load-env.ts` loads **repository root** `.env`. |
| Health | `GET /health` — `200` ok / `503` degraded. |
| BullMQ delay | Dev default ~**2s** delay before delivery unless `BULL_JOB_DELAY_MS=0` or `NODE_ENV=production` (see `queue.service` / `env`). |
| Admin | Router mounted at `/api/admin` — stubs for Phase 4. |

## Key env (Phase 1 minimum)

`DATABASE`, `REDIS_URL`, `JWT_SECRET` (≥16 chars), `PORT`, optional `COOKIE_SECURE`, `CORS_ORIGIN`, `BULL_JOB_DELAY_MS`.

## “Done when” (Phase 1)

Auth works; enqueueing a job shows activity **API → Redis → worker**; `redis-cli KEYS bull:*` shows BullMQ keys; job rows transition in the database.

---

# Phase 2 — First real AI path + uploads + realtime

## Goals

- **Summarise** with **Gemini** (text in JSON; PDF via upload).
- **Cloudinary** raw upload for PDFs; worker fetches by `secure_url` with SSRF-safe validation.
- **pdf-parse** (or equivalent) for PDF text extraction; chunking + chat completion for long text.
- **Redis PUBLISH** on `job:updates` from worker; **API** subscribes and forwards to **Socket.io** rooms `user:<userId>`.
- **Web**: job list, job detail, TanStack Query, Socket.io client, Vite proxy for `/api` and `/socket.io`.
- **Multer** for multipart PDF (`POST /api/jobs/summarise`), size/MIME limits.

## Delivered

| Area | What exists |
|------|-------------|
| Storage | Cloudinary `uploadRawAsset` / `destroyRaw`; folder `ai-task-runner/<userId>/`. |
| Routes | `POST /api/jobs/summarise` (multipart `file`) **before** `/:id`. |
| Worker | `processors/summarise.ts`; `lib/cloudinary-fetch.ts` (`fetchBinaryFromCloudinaryUrl`); `lib/job-events.ts` publish. |
| Realtime | `core/realtime.ts` — HTTP server + Socket.io + Redis subscriber; JWT on socket handshake. |
| Shared | `JOB_UPDATES_CHANNEL`, `JobUpdatePayload`. |
| Web | Dashboard, new job (summarise), job result, `useJobSocket`. |

## Key env (adds to Phase 1)

`GEMINI_API_KEY`, `GEMINI_MODEL` (worker); `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (API); worker needs `CLOUDINARY_CLOUD_NAME` for URL validation.

## “Done when” (Phase 2)

Text or PDF → **summary** on the job row; UI updates via **Socket.io**; optional `SUBSCRIBE job:updates` in Redis CLI.

---

# Phase 3 — Four job types + UI

## Goals

- Support **summarise**, **translate**, **generate** (image), **transcribe** — no **`sentiment`** job type.
- **JSON** job creation via strict **discriminated union** validation for `summarise` (text), `translate`, `generate`.
- **Multipart** for PDF (`/summarise`) and audio (`/transcribe`).
- **Worker processors**: translate (chat), generate-image (Gemini image), transcribe (Gemini audio); extend summarise.
- **Web**: one **New job** page with tabs per type; **Job result** renders summary, translation, image, transcript.

## Delivered

| Type | API | Worker |
|------|-----|--------|
| Summarise | JSON text + `POST /summarise` PDF | Gemini + pdf-parse / Cloudinary fetch |
| Translate | `POST /api/jobs` with `type: "translate"` | Gemini chat; `GEMINI_TRANSLATION_MODEL` optional |
| Generate (image) | `POST /api/jobs` with `type: "generate"` | Gemini native image; size → aspect ratio |
| Transcribe | `POST /api/jobs/transcribe` | Gemini multimodal (inline audio) |

**Removed:** `sentiment` from `JobType` and API validation.

## Key env (adds / optional)

Optional: `GEMINI_TRANSLATION_MODEL`, `GEMINI_IMAGE_MODEL`, `GEMINI_IMAGE_SIZE`, `GEMINI_TRANSCRIPTION_MODEL` (defaults documented in `.env.example`).

## “Done when” (Phase 3)

All four types runnable from UI or API with valid Gemini + Cloudinary (where uploads apply); results display correctly per type.

---

# Phase 4 — Operations & product rules (implemented)

**Status:** implemented. See **`docs/phase-4.md`** for runbooks and test steps.

## Delivered (summary)

| Theme | Implementation |
|-------|------------------|
| **Rate limiting** | Redis **daily** + **per-minute** slots; admin bypass. |
| **Concurrency cap** | Max `pending` + `active` jobs per plan. |
| **Deduplication** | Optional Redis key per user + payload hash (`DEDUP_WINDOW_SECONDS`; `0` = off). |
| **Usage metering** | `UsageDaily` (UTC day): `completed`, `failed`, `dead`; worker updates on outcomes. |
| **Priorities** | Existing BullMQ **priority** by plan unchanged. |
| **Dead jobs** | Worker increments `attempts`; status **`dead`** when `attempts >= max_attempts` (plan-based). |
| **Admin** | `GET /api/admin/stats`, `/users`, `/jobs` + web **Admin** page (`plan === admin`). |
| **User usage** | `GET /api/usage` + dashboard **Usage** bar. |
| **Retries** | `POST /api/jobs/:id/retry` for **`failed`** only; re-enforces limits. |

## “Done when” (Phase 4)

| Criterion |
|-----------|
| Free vs pro (vs admin) **rules enforced** in the API (rate limits, concurrency, optional generate block). |
| **`failed`** vs **`dead`** documented; **retry** only for failed. |
| **Admin** can inspect platform stats, users, and jobs (MVP). |

---

# Phase 5 — Production & scale (planned)

**Status:** not implemented as a closed milestone in this reference; scope follows the **roadmap**.

## Intended goals

| Theme | Work items |
|-------|------------|
| **Container images** | Dockerfiles for API, worker, web (multi-stage builds, non-root user, minimal base). |
| **Hosting** | Deploy to **Railway**, **Fly.io**, **Render**, or similar; **managed Postgres + Redis** or cloud equivalents. |
| **Configuration** | Secrets via platform env; `NODE_ENV=production`; `COOKIE_SECURE=true` behind HTTPS. |
| **Health & readiness** | `/health` used by load balancers; optional readiness probes. |
| **Scale workers** | Horizontally scale **worker** replicas; shared Redis + DB; BullMQ concurrency per process. |
| **Observability** | Structured logging, optional metrics (queue depth, job duration). |
| **Documentation** | Operations runbook for deploy, rollback, and env matrix (optional “README polish” for public repos). |

## “Done when” (Phase 5 — target)

| Criterion |
|-----------|
| **Deployed** demo or production stack with **documented** deploy steps. |
| **Health checks** pass in the target environment. |
| **Workers** can scale** out** without duplicate processing bugs (same job not processed twice — BullMQ guarantees). |

---

## Cross-phase dependencies

- **Phases 2–3** depend on **Phase 1** (auth, jobs, queue, worker loop).
- **Phase 4** assumes **Phase 3** job types and stable payloads for metering and limits.
- **Phase 5** assumes **Phase 4** (or at least stable API contracts) for production hardening.

---

## Quick command reference (all phases)

| Command | Use |
|---------|-----|
| `npm install` | Install workspaces (repo root). |
| `docker compose up -d` | Postgres + Redis. |
| `npm run db:migrate:dev` | Dev migrations. |
| `npm run db:generate` | Prisma client. |
| `npm run dev -w @ai-task-runner/api` | API + Socket.io. |
| `npm run dev -w @ai-task-runner/worker` | Worker. |
| `npm run dev -w @ai-task-runner/web` | Vite SPA. |
| `npm run dev` | All workspaces with `dev` script. |
| `npm run build` | Build shared + apps. |

---

## Reference files in this repo

- **`extracted_requirements.txt`** — original requirements narrative (if present).
- **`README.md`** — project overview and monorepo conventions.
- **`docs/`** — optional per-phase docs (`phase-1.md`, `phase-2.md`, `phase-3.md`) if present in your working tree.

---

*This file is a consolidated roadmap. Implementation details and env vars change over time; always verify against the codebase and `.env.example`.*
