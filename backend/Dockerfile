# Stage 1 — Build
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Stage 2 — Run
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN apk add --no-cache openssl libc6-compat

RUN addgroup -g 1001 -S nodejs && adduser -S backend -u 1001

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p /app/data && chown -R backend:nodejs /app /app/node_modules

USER backend
EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --schema=./prisma/schema.prisma && node dist/index.js"]
