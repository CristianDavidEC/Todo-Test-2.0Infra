# Stage 1: Build
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Manifiestos del monorepo (capa cacheable de install).
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/observability/package.json ./packages/observability/
COPY apps/services/example-service/package.json ./apps/services/example-service/

RUN pnpm install --frozen-lockfile

# Código fuente (los @app/* se bundlean con esbuild en el build).
COPY packages/ ./packages/
COPY apps/services/example-service/ ./apps/services/example-service/

WORKDIR /app/apps/services/example-service
RUN pnpm run build

# Stage 2: Production
FROM node:22-alpine AS production

# tini = init PID 1 → reenvía señales (SIGTERM en deploy/scale-in) y cosecha zombies,
# para shutdown limpio del proceso Node.
RUN apk add --no-cache tini && corepack enable && corepack prepare pnpm@9.15.4 --activate

# Logs JSON estructurados (sin pino-pretty) y modo prod de las libs.
ENV NODE_ENV=production

WORKDIR /app

# dist/main.js es self-contained excepto por los npm deps externalizados,
# que son deps directas del servicio → presentes tras `pnpm install --prod`.
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/config/package.json ./packages/config/
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/db/package.json ./packages/db/
COPY --from=builder /app/packages/auth/package.json ./packages/auth/
COPY --from=builder /app/packages/observability/package.json ./packages/observability/
COPY --from=builder /app/apps/services/example-service/package.json ./apps/services/example-service/
COPY --from=builder /app/apps/services/example-service/dist/ ./apps/services/example-service/dist/

RUN pnpm install --frozen-lockfile --prod

# Corre como el usuario no-root `node` (uid 1000, incluido en la imagen oficial).
RUN chown -R node:node /app
USER node

WORKDIR /app/apps/services/example-service

EXPOSE 3001

# Health check de contenedor (consumido por docker/compose; en ECS el equivalente va en
# la task definition). `/api/health` = setGlobalPrefix("api") + HealthController.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -q --spider http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
