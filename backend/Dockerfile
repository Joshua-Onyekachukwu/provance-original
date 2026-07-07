FROM node:22-slim AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable
RUN corepack prepare pnpm@9 --activate
RUN pnpm install --frozen-lockfile

FROM node:22-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable
RUN corepack prepare pnpm@9 --activate
RUN pnpm run build

FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 8080
ENV PORT=8080

CMD ["node", "dist/main"]

