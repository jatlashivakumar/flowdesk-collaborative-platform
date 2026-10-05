# FlowDesk — Enterprise Work OS

A real-time collaborative project management platform (Linear/Jira-style) built as a full-stack TypeScript monorepo.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| **State** | Zustand, TanStack Query v5 |
| **Forms** | React Hook Form + Zod |
| **Drag & Drop** | @dnd-kit |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **Cache / Queue** | Redis + BullMQ (real worker, not a stub) |
| **Real-time** | Socket.IO with typed events |
| **Auth** | JWT + httpOnly refresh cookies |
| **Email** | Nodemailer (Mailtrap for dev) |
| **File Upload** | AWS S3 + presigned URLs |
| **DevOps** | Docker, Docker Compose, Nginx |
| **CI/CD** | GitHub Actions |
| **Monorepo** | pnpm workspaces + Turborepo |

---

## Quick Start (Local Dev)

### Prerequisites
- Node.js ≥ 20
- pnpm ≥ 9 (`npm i -g pnpm@9`)
- PostgreSQL ≥ 15
- Redis ≥ 7

```bash
# 1. Install everything
pnpm install

# 2. Start Postgres + Redis
brew services start postgresql redis        # macOS
# or
docker run -d -p 5432:5432 -e POSTGRES_USER=flowdesk -e POSTGRES_PASSWORD=flowdesk123 -e POSTGRES_DB=flowdesk_db postgres:16-alpine
docker run -d -p 6379:6379 redis:7-alpine

# 3. Set up the database
make db-migrate      # runs prisma migrate dev
make db-seed         # creates demo accounts + sample data

# 4. Run everything
pnpm dev
```

- **API** → http://localhost:4000
- **Web** → http://localhost:5173

**Demo accounts (after seeding):**
| Email | Password | Role |
|-------|----------|------|
| alice@flowdesk.app | Password123 | Owner |
| bob@flowdesk.app | Password123 | Member |
| carol@flowdesk.app | Password123 | Viewer |

---

## Quick Start (Docker — One Command)

```bash
# Copy env and start everything
cp apps/api/.env.example apps/api/.env
make docker-up
```

Open http://localhost — Postgres, Redis, API, and Web all start automatically.

---

## Project Structure

```
flowdesk/
├── apps/
│   ├── api/                     Express + Socket.IO backend
│   │   ├── prisma/schema.prisma PostgreSQL schema
│   │   ├── src/
│   │   │   ├── config/          env, db, redis, logger, plans, seed
│   │   │   ├── controllers/     auth, workspace, project, task
│   │   │   ├── middleware/      auth (JWT), RBAC, validation, errors
│   │   │   ├── routes/          all routes in one typed file
│   │   │   ├── services/        email, S3, BullMQ queue (real worker)
│   │   │   ├── sockets/         typed Socket.IO server
│   │   │   └── utils/           AppError, tokens, helpers
│   │   └── Dockerfile
│   └── web/                     React + Vite frontend
│       ├── src/
│       │   ├── components/
│       │   │   ├── kanban/      KanbanColumn, TaskCard (dnd-kit)
│       │   │   ├── layout/      WorkspaceLayout sidebar
│       │   │   └── modals/      TaskDrawer, CreateTaskModal
│       │   ├── pages/           Login, Register, Workspaces, Projects,
│       │   │                    ProjectBoard, Members, Settings, Profile
│       │   ├── store/           Zustand (auth, workspace)
│       │   └── lib/             Axios (auto-refresh), Socket.IO singleton
│       └── Dockerfile
├── packages/
│   └── shared-types/            Zod schemas + RBAC + Socket event types
│                                shared between API and Web
├── infra/nginx/nginx.conf       Nginx reverse proxy + SPA routing
├── .github/workflows/ci.yml     GitHub Actions CI + Docker build
├── docker-compose.yml           Full stack in one command
├── Makefile                     Shortcuts for every common task
└── turbo.json                   Turborepo pipeline
```

---

## API Reference

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh-token
POST   /api/auth/logout
GET    /api/auth/me
PATCH  /api/auth/me

POST   /api/workspaces
GET    /api/workspaces
GET    /api/workspaces/:id
GET    /api/workspaces/:id/members
POST   /api/workspaces/:id/members          invite by email
DELETE /api/workspaces/:id/members/:mid

POST   /api/workspaces/:wid/projects
GET    /api/workspaces/:wid/projects
GET    /api/workspaces/:wid/projects/:pid
DELETE /api/workspaces/:wid/projects/:pid   archive

POST   /api/workspaces/:wid/projects/:pid/tasks
GET    /api/workspaces/:wid/projects/:pid/tasks    cursor pagination
GET    /api/workspaces/:wid/projects/:pid/tasks/:tid
PATCH  /api/workspaces/:wid/projects/:pid/tasks/:tid  requires expectedVersion
DELETE /api/workspaces/:wid/projects/:pid/tasks/:tid
POST   /api/workspaces/:wid/projects/:pid/tasks/:tid/comments
GET    /api/workspaces/:wid/projects/:pid/tasks/:tid/comments
```

## Socket Events

```
Client → Server:
  room:join(workspaceId)         subscribe to workspace room
  room:leave(workspaceId)
  task:move({ taskId, toStatus, toIndex })
  typing:start({ taskId })
  typing:stop({ taskId })

Server → Client:
  task:created(task)
  task:updated(task)
  task:deleted({ taskId, projectId })
  notification:new(notification)
  typing:update({ taskId, users })
  error({ message, code })
```

---

## Key Technical Decisions

**Optimistic Concurrency Control** — Every task has a `version` int. `PATCH /tasks/:id` requires `expectedVersion`. The API does `WHERE id = $1 AND version = $2` — if the row was already updated by someone else, zero rows match and we return `409 VERSION_CONFLICT`. No silent overwrites in a multi-user board.

**Real BullMQ Worker** — Notifications are enqueued into Redis via BullMQ with retry logic (3 attempts, exponential backoff). The worker runs in-process in dev, and can be split into a separate service for production. Includes DB persist + Socket.IO emit + email.

**Shared Zod Schemas** — `packages/shared-types` is imported by both the API (for `req.body` validation) and React (for TypeScript types + `hasPermission()`). The two layers structurally cannot disagree on shapes.

**RBAC from One Source of Truth** — `hasPermission(role, action)` lives in shared-types. The API enforces it in middleware. The React UI uses the exact same function to gate buttons and forms. Zero drift.


**JWT Rotation** — Access tokens: 15 min, in memory. Refresh tokens: 7 days, httpOnly cookie. Axios interceptor auto-retries on 401, refreshes transparently, replays the original request.

**Cursor Pagination** — `GET /tasks` uses cursor-based pagination (`?cursor=id&limit=50`) instead of `OFFSET`. Stable under concurrent inserts — no duplicate/missing rows when pages shift.

---

## Features

- ✅ Register / Login / JWT refresh via httpOnly cookie
- ✅ Profile page (name, bio)
- ✅ Multi-workspace with roles (owner / admin / member / viewer)
- ✅ Projects with auto-key generation and color picker
- ✅ Drag-and-drop Kanban board (6 columns) via @dnd-kit
- ✅ Real-time sync across all connected users via Socket.IO
- ✅ Task drawer — edit title, status, priority, assignee, due date inline
- ✅ Comments with real-time count update
- ✅ Typing indicators on tasks
- ✅ Notifications via BullMQ worker + Socket.IO + email
- ✅ Optimistic concurrency control (409 VERSION_CONFLICT)
- ✅ RBAC enforced on API middleware AND React UI buttons
- ✅ Cursor-based pagination for task lists
- ✅ AWS S3 file upload service (wired, needs credentials)
- ✅ Docker Compose — one command starts everything
- ✅ Nginx — reverse proxy, SPA routing, WebSocket proxy
- ✅ GitHub Actions CI — lint, typecheck, build, Docker push
- ✅ Database seed with demo data

## Roadmap

- [ ] Vitest unit + integration tests
- [ ] Email verification on register
- [ ] Password reset flow
- [ ] Razorpay / Stripe billing
- [ ] File attachments on tasks (S3 wired, UI needed)
- [ ] Activity log per task
- [ ] Dark mode

---

## Production Deployment Checklist

```bash
# 1. Set secure secrets
JWT_SECRET=<random 64 char string>
JWT_REFRESH_SECRET=<different random 64 char string>

# 2. Set your domain
CLIENT_URL=https://yourdomain.com

# 3. Configure SMTP (use Resend, SendGrid, or SES)
SMTP_HOST=smtp.resend.com
SMTP_USER=resend
SMTP_PASS=<api key>

# 4. Configure S3
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_S3_BUCKET=<bucket>

# 5. Deploy
make docker-up
```