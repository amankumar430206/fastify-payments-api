# 🚀 Fastify Payments API - Complete Usage Guide

## Quick API Testing Kit

### 1. Setup (2 minutes)

```bash
# Install & start (MongoDB + Redis + API)
npm install
docker-compose -f docker-compose.dev.yml up
```

**All services ready at:**

- API: `http://localhost:3000`
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`

---

## 2. Complete Test Flow

### Step 1: Register User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@test.com",
    "password": "secure123"
  }'
```

**Response:** `{"data":{"accessToken":"eyJ..."}}`

### Step 2: Login (save the token)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@test.com",
    "password": "secure123"
  }'
```

**Copy** `accessToken` from response → **TOKEN=eyJ...**

### Step 3: Create Wallet

```bash
curl -X POST http://localhost:3000/api/wallets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "currency": "USD"
  }'
```

**Response:** `{"data":{"id":"...","currency":"USD","balance":0}}`  
**Copy** `walletId` → **WALLET_ID=...**

### Step 4: Add Funds (Credit) - **Watch background job!**

```bash
curl -X POST http://localhost:3000/api/wallets/credit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "idempotency-key: credit-123" \
  -d '{
    "walletId": "'$WALLET_ID'",
    "amount": 100.50,
    "metadata": {"source": "payment-gateway"}
  }'
```

**Response:** `{"data":{"transactionId":"..."}}`  
**Check logs:** `"Processing notification job"` → `"Notification sent successfully"`

### Step 5: Withdraw (Debit)

```bash
curl -X POST http://localhost:3000/api/wallets/debit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "idempotency-key: debit-456" \
  -d '{
    "walletId": "'$WALLET_ID'",
    "amount": 25.00
  }'
```

### Step 6: Transaction History (Cached)

```bash
curl "http://localhost:3000/api/transactions?walletId=$WALLET_ID&limit=10"
```

**Response:** Paginated transactions with `nextCursor`

---

## 3. Advanced Features Demo

### 🔄 Idempotency (Retry safe)

```bash
# Run TWICE - same result both times!
curl -X POST http://localhost:3000/api/wallets/credit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "idempotency-key: idempotent-test" \
  -d '{"walletId":"'$WALLET_ID'","amount":50}'
```

### ⚡ Rate Limiting

```bash
# Hammer it - gets 429 after 100 requests/minute
for i in {1..105}; do
  curl -s -w "%{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    "http://localhost:3000/api/transactions?walletId=$WALLET_ID" \
    | grep -q 429 && echo "✅ Rate limited at $i"
done
```

### 🔒 Auth Fail

```bash
# Should fail 401
curl -X POST http://localhost:3000/api/wallets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-token" \
  -d '{"currency":"EUR"}'
```

---

## 4. Key Flows Visualized

```
📥 User registers → JWT issued
     ↓
📤 POST /wallets → Wallet created (MongoDB)
     ↓
💳 POST /credit → MongoDB Transaction (atomic)
     ↓
🔄 enqueueJob() → Redis queue
     ↓
⚙️ Worker → NotificationJob.send()
     ↓
📧 Email/Webhook sent (with retry)
     ↓
📊 GET /transactions → Redis cache → MongoDB
```

```
Security Layers:
Authorization: Bearer <JWT>          ← Required
idempotency-key: unique-string      ← Prevents double spend
Rate limit: 100/min per IP          ← DDoS protection
Helmet headers                      ← CSP, XSS protection
JSON Schema                         ← Strict input validation
```

---

## 5. Logs to Watch (Real-time)

**Terminal 1 (API logs):**

```
{"level":30,"time":1738551600000,"pid":1,"hostname":"api","reqId":"uuid","req":{"method":"POST","url":"/api/wallets/credit"},"msg":"request completed","statusCode":200}
{"level":30,"time":1738551601000,"userId":"alice","channel":"email","msg":"Processing notification job"}
{"level":30,"time":1738551601500,"userId":"alice","channel":"email","msg":"Notification sent successfully"}
```

**Terminal 2 (Redis/Mongo):**

```
# Jobs queue: redis-cli monitor | grep jobs
"lpush" "jobs:default" "{\"type\":\"notification\",...}"
"brpop" "jobs:default" "5"
```

---

## 6. Production Deployment

```bash
# Docker
docker build -t payments-api .
docker run -p 3000:3000 payments-api

# Kubernetes
kubectl apply -f k8s/
kubectl port-forward svc/payments-api 3000:80
```

---

## 7. Troubleshooting

| Issue                | Check                                          |
| -------------------- | ---------------------------------------------- |
| `Unauthorized`       | Verify JWT token                               |
| `Wallet not found`   | Check `walletId` from Step 3                   |
| `Insufficient funds` | Credit before debit                            |
| No notifications     | Check Redis: `redis-cli llen jobs:default`     |
| Rate limited         | Wait 1 minute or check `x-ratelimit-*` headers |

---

**💡 Pro Tips:**

- Always use `idempotency-key` for money operations
- History endpoint auto-caches (30s TTL)
- Worker runs forever in background
- Graceful shutdown on SIGTERM (K8s friendly)

**Now you can test the full production flow end-to-end! 🎉**
