.PHONY: install dev dev-api dev-web build docker-up docker-down docker-logs db-migrate db-seed db-studio clean help

## Install all dependencies
install:
	pnpm install

## Run everything (API + Web) in dev mode
dev:
	pnpm dev

## Run only the API
dev-api:
	pnpm dev:api

## Run only the Web
dev-web:
	pnpm dev:web

## Build everything
build:
	pnpm build

## Start all Docker services (Postgres + Redis + API + Web)
docker-up:
	docker-compose up -d
	@echo "✅ FlowDesk running at http://localhost"

## Stop all Docker services
docker-down:
	docker-compose down

## Stop and remove volumes (wipes DB!)
docker-clean:
	docker-compose down -v

## Tail Docker logs
docker-logs:
	docker-compose logs -f

## Run Prisma migrations (dev)
db-migrate:
	cd apps/api && npx prisma migrate dev

## Run Prisma migrations (production)
db-migrate-prod:
	cd apps/api && npx prisma migrate deploy

## Seed the database
db-seed:
	cd apps/api && npx tsx src/config/seed.ts

## Open Prisma Studio (DB GUI)
db-studio:
	cd apps/api && npx prisma studio

## Generate Prisma client
db-generate:
	cd apps/api && npx prisma generate

## Clean all build outputs
clean:
	pnpm clean
	find . -name "dist" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null; true

## Show this help
help:
	@grep -E '^##' Makefile | sed 's/## //'
