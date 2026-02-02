# 🔬 Detailed Production Flows

## Flow 1: **Complete Wallet Transaction Lifecycle** (Critical Path)

```
1. Client → POST /api/wallets/credit {walletId, amount=100, idempotency-key=txn-123}
   ↓ (preHandler hook)
2. Rate limit check ✓ → JWT verify ✓ → Idempotency check (Redis MISS)
3. WalletService.changeBalance():
   ↓ MongoDB Transaction:
   4a. Find wallet (balance=50) ✓
   4b. CAS update: balance 50→150 ✓
   4c. Insert Transaction record
   4d. Commit ✓
5. enqueueJob() → Redis LPUSH jobs:default
6. reply 200 {transactionId: "abc123"}
   ↓ onSend hook → Redis SET idem:txn-123 {status:200,body}
7. Worker BRPOP → NotificationJob.send()
   ↓ Email service → Success ✓
```

**Test it:**

```bash
# Full flow with curl variables
TOKEN=your_jwt
WALLET=your_wallet_id

curl -X POST http://localhost:3000/api/wallets/credit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "idempotency-key: detailed-flow-1" \
  -d "{\"walletId\":\"$WALLET\",\"amount\":100,\"metadata\":{\"ref\":\"order-456\"}}"
```

---

## Flow 2: **Idempotency Replay** (Duplicate Request)

```
Client retries (network blip) → SAME idempotency-key=txn-123
↓ preHandler hook
Redis HIT → reply 200 (cached response)
↓ No service call, no double spend!
```

**Demo:**

```bash
# Run SAME request twice:
curl -X POST ... -H "idempotency-key: idempotent-demo" -d '{...}'
curl -X POST ... -H "idempotency-key: idempotent-demo" -d '{...}'  # Same!
```

**Redis inspect:**

```bash
redis-cli GET idem:idempotent-demo
# → {"statusCode":200,"body":{"data":{"transactionId":"..."}}}
```

---

## Flow 3: **Race Condition Protection** (Concurrent Debit)

```
2 clients → debit $75 simultaneously (balance=100)
↓ Both read balance=100
↓ Client1: update balance=25 ✓
↓ Client2: CAS fails (expected 100≠25) → 409 Conflict
↓ Only ONE succeeds!
```

**Simulate (race condition test):**

```bash
# Terminal 1
curl -X POST /api/wallets/debit -H "idempotency-key: race1" -d '{"amount":75}'

# Terminal 2 (milliseconds later)
curl -X POST /api/wallets/debit -H "idempotency-key: race2" -d '{"amount":75}'
# → 409 "Balance changed concurrently"
```

---

## Flow 4: **Background Job + Retry** (Notification Failure)

```
1. Credit wallet ✓ → enqueue notification
2. Worker → Email service → Timeout (10% fail rate)
3. Retry #1 (2s delay) → Fail
4. Retry #2 (4s delay) → Success ✓
5. Redis DEL retry counter
```

**Force failure demo:**

```bash
# Credit triggers job → check logs for retries
# Redis: redis-cli GET notification:retry:alice:email:no-tx
```

---

## Flow 5: **Caching Layer** (Transaction History)

```
GET /transactions?walletId=abc&limit=10
↓ Redis GET wallet:abc:tx:10:null → MISS
↓ MongoDB query → Cache SETEX (30s)
↓ Reply + nextCursor
↓ 2nd request → Redis HIT (1ms vs 50ms DB)
```

**Benchmark:**

```bash
# First call (cache miss)
time curl "http://localhost:3000/api/transactions?walletId=$WALLET_ID"

# Second call (cache hit)
time curl "http://localhost:3000/api/transactions?walletId=$WALLET_ID"
```

---

## Flow 6: **Rate Limiting + Headers**

```
100 req/min → All 200 + x-ratelimit-remaining headers
101st req → 429 + x-ratelimit-reset header
```

**Test headers:**

```bash
curl -I -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/transactions?walletId=$WALLET_ID"
```

```
x-ratelimit-limit: 100
x-ratelimit-remaining: 47
x-ratelimit-reset: 1738551600
```

---

## Flow 7: **Error Scenarios** (Production Resilience)

| Scenario          | Request                            | Expected               | Why                     |
| ----------------- | ---------------------------------- | ---------------------- | ----------------------- |
| Invalid JWT       | `Authorization: Bearer bad`        | 401 Unauthorized       | JWT verify fails        |
| Wrong wallet      | `debit walletId=wrong`             | 404 Not Found          | User doesn't own wallet |
| Overdraw          | `debit amount=200` (balance=100)   | 409 Insufficient funds | Balance check           |
| Schema violation  | `credit amount=-10`                | 400 Validation         | JSON Schema             |
| Duplicate wallet  | `POST /wallets currency=USD` (2nd) | 409 Conflict           | Unique index            |
| Concurrent update | 2x debit simultaneously            | 1x 200, 1x 409         | CAS protection          |

**Test insufficient funds:**

```bash
curl -X POST /api/wallets/debit \
  -H "Authorization: Bearer $TOKEN" \
  -H "idempotency-key: overdraft" \
  -d '{"walletId":"'$WALLET_ID'","amount":999}'
# → 409 "Insufficient funds"
```

---

## Flow 8: **Pagination** (Transaction History)

```
GET /transactions?walletId=abc&limit=5
→ items[5] + nextCursor="507f1f77bcf86cd799439011"

GET /transactions?walletId=abc&limit=5&cursor=507f1f77bcf86cd799439011
→ Next 5 items
```

---

## Flow 9: **Graceful Shutdown** (K8s Deploy)

```
K8s → SIGTERM → 30s termination grace
↓ app.close() hook
Mongo.close() ✓ → Redis.quit() ✓ → Worker stops
↓ HTTP 503 for new reqs, drain existing
```

**Test locally:**

```bash
npm start &
sleep 2
kill %1    # Graceful shutdown
```

---

## 🔍 Debug Commands

```bash
# Redis queues
redis-cli llen jobs:default
redis-cli llen jobs:retry

# Redis cache
redis-cli keys wallet:*

# MongoDB
docker exec mongo mongosh payments --eval 'db.wallets.find()'
docker exec mongo mongosh payments --eval 'db.transactions.find().sort({createdAt:-1}).limit(5)'

# Logs tail
docker-compose logs -f api
```

## 📊 Expected Metrics (Production)

```
RPS: 2000+ (Fastify baseline)
P99 latency: <50ms (cached reads)
Wallet txn: <100ms (Mongo transaction)
Notification: async (non-blocking)
Memory: ~100MB per pod
```

**This covers 95% of production scenarios! Deploy with confidence 🚀**
