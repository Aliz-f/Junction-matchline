FROM node:24-alpine AS dependencies
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ARG MATCHLINE_API_BASE_URL
ENV MATCHLINE_API_BASE_URL=${MATCHLINE_API_BASE_URL}
RUN pnpm build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 10001 matchline && adduser --system --uid 10001 --ingroup matchline matchline
COPY --from=build --chown=matchline:matchline /app/public ./public
COPY --from=build --chown=matchline:matchline /app/.next/standalone ./
COPY --from=build --chown=matchline:matchline /app/.next/static ./.next/static
USER matchline
EXPOSE 3000
CMD ["node", "server.js"]
