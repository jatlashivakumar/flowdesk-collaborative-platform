# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web

RUN pnpm --filter @flowdesk/web run build

# ── Nginx stage ───────────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY infra/nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
