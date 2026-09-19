FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --prefer-offline --no-audit --no-fund

FROM node:22-slim AS builder
WORKDIR /app
ARG NEXT_PUBLIC_GAR_DATASET_ID
ENV NEXT_PUBLIC_GAR_DATASET_ID=$NEXT_PUBLIC_GAR_DATASET_ID
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3001
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3001
CMD ["node", "server.js"]
