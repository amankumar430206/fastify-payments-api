# Stage 1: build
FROM node:20-alpine AS builder

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build   # outputs to dist/

# Stage 2: runtime
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

USER nodejs

CMD ["node", "dist/server.js"]
