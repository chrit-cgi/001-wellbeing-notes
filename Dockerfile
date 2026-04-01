# ── Stage 1: Build frontend ───────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Runtime ──────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Copy production dependencies manifest and install only prod deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend and server code
COPY --from=builder /app/dist ./dist
COPY server ./server

# Persistent data volume for SQLite
VOLUME ["/app/data"]

ENV PORT=3000
ENV DATABASE_PATH=/app/data/db.sqlite
ENV NODE_ENV=production

EXPOSE 3000

# Bind to 0.0.0.0 (required by Sliplane)
CMD ["node", "server/index.js"]
