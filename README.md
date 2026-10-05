# FlowDesk — Enterprise Work OS

A real-time collaborative project management platform inspired by tools like Linear and Jira, built as a full-stack TypeScript monorepo.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| **State Management** | Zustand, TanStack Query v5 |
| **Forms & Validation** | React Hook Form, Zod |
| **Drag & Drop** | @dnd-kit |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL, Prisma ORM |
| **Cache / Background Jobs** | Redis, BullMQ |
| **Real-time** | Socket.IO |
| **Authentication** | JWT + httpOnly refresh cookies |
| **Email** | Nodemailer |
| **File Storage** | AWS S3 + presigned URLs |
| **DevOps** | Docker, Docker Compose, Nginx |
| **CI/CD** | GitHub Actions |
| **Monorepo** | pnpm Workspaces + Turborepo |

---

## Key Features

- User registration and authentication
- JWT authentication with refresh tokens
- Multi-workspace collaboration
- Role-based access control (RBAC)
- Workspace member management
- Project and task management
- Drag-and-drop Kanban board
- Real-time updates across connected users
- Task comments and typing indicators
- Background notification processing
- Cursor-based pagination
- Optimistic concurrency control
- AWS S3 presigned upload support
- Dockerized development environment
- Nginx reverse proxy
- GitHub Actions CI/CD
- Database seeding with sample data

---

## Architecture

```text
                    ┌─────────────────────┐
                    │   React + TypeScript│
                    │      Frontend      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Node + Express    │
                    │       API           │
                    └──────┬───────┬──────┘
                           │       │
              ┌────────────┘       └─────────────┐
              ▼                                  ▼
     ┌─────────────────┐                ┌─────────────────┐
     │   PostgreSQL    │                │ Redis + BullMQ  │
     │     + Prisma    │                │ Background Jobs │
     └─────────────────┘                └─────────────────┘
              │
              ▼
     ┌─────────────────┐
     │    Socket.IO    │
     │ Real-time Sync  │
     └─────────────────┘
```

---

## Project Structure

```text
flowdesk/
├── apps/
│   ├── api/                    # Node.js + Express backend
│   └── web/                    # React + Vite frontend
│
├── packages/
│   └── shared-types/           # Shared types and validation
│
├── infra/
│   └── nginx/                  # Nginx configuration
│
├── .github/
│   └── workflows/              # GitHub Actions CI/CD
│
├── docker-compose.yml
├── Makefile
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
pnpm install
```

### Database Setup

Configure the required environment variables in:

```text
apps/api/.env
```

Then run:

```bash
make db-migrate
make db-seed
```

### Development

```bash
pnpm dev
```

The application runs the frontend and backend development services.

### Docker

```bash
cp apps/api/.env.example apps/api/.env
make docker-up
```

Docker Compose starts the required application services for local development.

---

## Core Engineering Highlights

### Real-time Collaboration

Socket.IO is used to synchronize workspace and task updates across connected users.

### Role-Based Access Control

RBAC is used to control access to workspace and project functionality based on user roles.

### Background Processing

Redis and BullMQ are used for asynchronous notification processing and background jobs.

### Optimistic Concurrency

Task versioning is used to help prevent conflicting updates when multiple users modify the same task.

### Cursor Pagination

Task lists use cursor-based pagination for handling larger datasets and changing data.

### File Uploads

AWS S3 presigned URLs are used to support direct file uploads without sending file data through the application server.

---

## Project Status

FlowDesk currently includes:

- Authentication and authorization
- Workspace and member management
- Project and task management
- Kanban board
- RBAC
- Real-time collaboration
- Background job processing
- PostgreSQL with Prisma
- Redis and BullMQ
- AWS S3 upload support
- Docker and Nginx infrastructure
- GitHub Actions CI/CD

AWS S3 upload support is wired into the application and requires valid AWS credentials to use.


---

## License

This project is intended as a personal full-stack engineering project and portfolio demonstration.
