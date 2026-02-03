FROM node:24.9.0-bookworm-slim AS base

WORKDIR /app
ENV NODE_ENV=production
ENV CONFIG_FILE_PATH=/etc/bot/config.yaml

RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm templates:build
RUN pnpm build

FROM base AS runtime
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
RUN npx playwright install chromium --with-deps

COPY --from=build /app/dist ./dist
COPY --from=build /app/assets ./assets

VOLUME ["/etc/bot"]

CMD ["pnpm", "prod"]

