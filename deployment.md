You can containerize this app with a minimal, production‑grade Node image and then run it on Kubernetes with proper probes, config, and scalable replicas. [snyk](https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/)

```
docker-compose -f docker-compose.dev.yml up
```

---

## Docker setup

### `Dockerfile` (multi‑stage, Node 20+)

```dockerfile
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
```

Key points: multi‑stage build, `npm ci`, non‑root user, and only production deps in final image, which matches Node+Docker hardening guidance. [cheatsheetseries.owasp](https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html)

### `.dockerignore`

```gitignore
node_modules
npm-debug.log
Dockerfile
.git
dist
.env
```

### Local Docker build & run

```bash
docker build -t fastify-payments:latest .
docker run --rm -p 3000:3000 \
  -e PORT=3000 \
  -e MONGO_URI=mongodb://host.docker.internal:27017/payments \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  -e JWT_SECRET=super-secret \
  fastify-payments:latest
```

---

## Kubernetes manifests (core app)

Assume image `your-registry/fastify-payments:1.0.0` pushed to a registry. [cloudnativenow](https://cloudnativenow.com/topics/deploying-node-js-apps-to-a-kubernetes-cluster/)

### Namespace (optional)

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: payments
```

### ConfigMap & Secret

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: payments-config
  namespace: payments
data:
  PORT: "3000"
  NODE_ENV: "production"
  MONGO_URI: "mongodb://mongo:27017/payments"
  REDIS_URL: "redis://redis:6379"
  LOG_LEVEL: "info"
  RATE_LIMIT_MAX: "200"
  RATE_LIMIT_WINDOW: "1 minute"
  IDEMPOTENCY_TTL: "3600"
---
apiVersion: v1
kind: Secret
metadata:
  name: payments-secrets
  namespace: payments
type: Opaque
stringData:
  JWT_SECRET: "super-secret-change-me"
```

Using ConfigMap/Secret keeps config and secrets out of the container image, following Kubernetes configuration best practices. [kubernetes](https://kubernetes.io/blog/2025/11/25/configuration-good-practices/)

### Deployment (Fastify API)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-api
  namespace: payments
  labels:
    app: payments-api
spec:
  replicas: 3
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app: payments-api
  template:
    metadata:
      labels:
        app: payments-api
    spec:
      containers:
        - name: payments-api
          image: your-registry/fastify-payments:1.0.0
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: payments-config
            - secretRef:
                name: payments-secrets
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 5
          resources:
            requests:
              cpu: "100m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
```

Using HTTP readiness/liveness probes with the `/health` endpoint integrates cleanly with Kubernetes’ probe model. Multiple replicas give horizontal scalability out of the box. [learnkube](https://learnkube.com/deploying-nodejs-kubernetes)

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payments-api
  namespace: payments
spec:
  selector:
    app: payments-api
  ports:
    - port: 80
      targetPort: 3000
      protocol: TCP
  type: ClusterIP
```

This exposes the app internally; you can front it with an Ingress / API‑gateway for external access. [cloudnativenow](https://cloudnativenow.com/topics/deploying-node-js-apps-to-a-kubernetes-cluster/)

### Ingress (example, NGINX)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: payments-api
  namespace: payments
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "1m"
spec:
  ingressClassName: nginx
  rules:
    - host: api.payments.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: payments-api
                port:
                  number: 80
```

---

## MongoDB and Redis on Kubernetes (simple dev setup)

For production you’d usually use managed services, but here’s minimal in‑cluster stateful services. [devtron](https://devtron.ai/blog/deploy-microservices-on-kubernetes/)

### MongoDB

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongo-pvc
  namespace: payments
spec:
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 5Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongo
  namespace: payments
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongo
  template:
    metadata:
      labels:
        app: mongo
    spec:
      containers:
        - name: mongo
          image: mongo:6
          ports:
            - containerPort: 27017
          volumeMounts:
            - name: mongo-data
              mountPath: /data/db
      volumes:
        - name: mongo-data
          persistentVolumeClaim:
            claimName: mongo-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: mongo
  namespace: payments
spec:
  selector:
    app: mongo
  ports:
    - port: 27017
      targetPort: 27017
```

### Redis

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: payments
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: payments
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
```

---

## App + Docker + K8s overview

| Layer      | What you do                                           | Why it matters                                                                                                                                     |
| ---------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fastify    | `/health` endpoint, graceful `app.close()` on SIGTERM | Works cleanly with probes and rolling updates. [snyk](https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/) |
| Docker     | Multi‑stage build, non‑root user, prod deps only      | Smaller, more secure images; faster pulls. [snyk](https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/)     |
| K8s config | ConfigMap + Secret for env, probes, resources         | Twelve‑factor config, safer secrets, better availability. [learnkube](https://learnkube.com/deploying-nodejs-kubernetes)                           |
| K8s infra  | Separate Mongo/Redis Deployments/Services             | Clear separation of concerns, scalable independently. [learnkube](https://learnkube.com/deploying-nodejs-kubernetes)                               |

If you want, I can add:

- a small Helm chart layout for this stack, or
- Fastify graceful shutdown hooks wired to SIGTERM specifically for K8s rollouts.
