# Fastify Payments API

Production-grade **Fastify + TypeScript** payments API (Stripe/Razorpay style) with atomic wallet transactions, JWT auth, Redis caching/jobs, and Kubernetes deployment.

## ✨ Features

- **High-performance** Fastify with JSON Schema validation + precompiled serializers
- **Atomic wallet operations** (MongoDB transactions, no race conditions)
- **JWT auth + RBAC** with Fastify decorators
- **Idempotency keys** for safe retries
- **Rate limiting** + security headers
- **Redis caching** (transaction history) + **background jobs** (notifications)
- **Plugin-based architecture** with proper separation of concerns
- **Docker + Kubernetes** ready
- **Type-safe** with strict TypeScript + declaration merging

## 🏗️ Architecture

```
src/
├── app.ts           # App bootstrap + routes
├── server.ts        # HTTP server + worker
├── plugins/         # Cross-cutting: mongo, redis, jwt, rate-limit, idempotency
├── modules/         # Feature modules: auth, user, wallet, transaction
├── jobs/           # Redis-based background queue
├── utils/          # Shared: errors, reply helpers, RBAC
└── config/         # Environment config
```

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <repo>
cd fastify-payments
npm install
cp .env.example .env
```

### 2. Run with Docker Compose (recommended)

```bash
docker-compose -f docker-compose.dev.yml up
```

Or manually:

```bash
# Start MongoDB & Redis (ports 27017, 6379)
npm run dev
```

### 3. Test the API

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123"}'

# Login & get JWT
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123"}'

# Create wallet (use Authorization: Bearer <token>)
curl -X POST http://localhost:3000/api/wallets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt>" \
  -d '{"currency":"USD"}'

# Credit wallet (with idempotency)
curl -X POST http://localhost:3000/api/wallets/credit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt>" \
  -H "idempotency-key: abc123" \
  -d '{"walletId":"...","amount":100}'
```

## 📋 API Endpoints

| Method | Endpoint              | Auth | Description                  |
| ------ | --------------------- | ---- | ---------------------------- |
| `POST` | `/api/auth/register`  | -    | Create account               |
| `POST` | `/api/auth/login`     | -    | Get JWT token                |
| `POST` | `/api/wallets`        | ✅   | Create wallet                |
| `POST` | `/api/wallets/credit` | ✅   | Add funds (atomic)           |
| `POST` | `/api/wallets/debit`  | ✅   | Withdraw funds               |
| `GET`  | `/api/transactions`   | ✅   | Transaction history (cached) |
| `GET`  | `/health`             | -    | Health check                 |

## 🛠️ Development

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build for production
npm run build

# Dev mode (auto-reload)
npm run dev
```

## 🐳 Docker

```bash
# Build
docker build -t fastify-payments .

# Run (with local Mongo/Redis)
docker run -p 3000:3000 \
  -e MONGO_URI="mongodb://host.docker.internal:27017/payments" \
  -e REDIS_URL="redis://host.docker.internal:6379" \
  fastify-payments
```

## ☸️ Kubernetes

Apply manifests:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mongo.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/config.yaml
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/api-service.yaml
```

## 🔧 Configuration

| Env Var          | Default                          | Description          |
| ---------------- | -------------------------------- | -------------------- |
| `PORT`           | `3000`                           | HTTP port            |
| `MONGO_URI`      | `mongodb://mongo:27017/payments` | MongoDB connection   |
| `REDIS_URL`      | `redis://redis:6379`             | Redis for cache/jobs |
| `JWT_SECRET`     | (required)                       | JWT signing key      |
| `RATE_LIMIT_MAX` | `100`                            | Requests per window  |
| `LOG_LEVEL`      | `info`                           | Pino log level       |

## 🎯 Performance Features

- **JSON Schema validation** with precompiled serializers (~2x faster than Joi)
- **Plugin encapsulation** (no global state)
- **Hooks over middleware** (path-specific execution)
- **Redis TTL caching** for transaction history
- **MongoDB transactions** for atomic wallet ops
- **Idempotency keys** prevent double-spends

## 🧪 Testing

Add your tests in `src/__tests__/`. Uses `tap` (Fastify's preferred test runner):

```bash
npm install -D tap @fastify/merge-json-schemas
```

## 📈 Monitoring

- **Structured logging** with request correlation IDs
- **Health endpoint** (`/health`) for K8s probes
- **Prometheus metrics** ready (add `@fastify/metrics`)

## 🚀 Production Checklist

- [ ] Set `JWT_SECRET` (32+ chars)
- [ ] Use managed MongoDB/Redis
- [ ] Configure proper rate limits
- [ ] Enable HTTPS (Ingress/TLS)
- [ ] Set up log aggregation
- [ ] Add alerting on `/health`
- [ ] HorizontalPodAutoscaler for K8s

## 🤝 Contributing

1. Fork & clone
2. `npm install`
3. `npm run dev`
4. Create feature branch
5. PR with clear description

## 📄 License

MIT - see [LICENSE](LICENSE)

---

> **Why Fastify?** 70% faster than Express, built-in TypeScript support, plugin system scales to enterprise. [daily](https://daily.dev/blog/how-to-build-blazing-fast-apis-with-fastify-and-typescript)
