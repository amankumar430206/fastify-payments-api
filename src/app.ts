import type { FastifyInstance } from "fastify";
import { buildFastify } from "./plugins/fastify";
import mongoPlugin from "./plugins/mongo";
import redisPlugin from "./plugins/redis";
import jwtPlugin from "./plugins/jwt";
import securityPlugin from "./plugins/security";
import rateLimitPlugin from "./plugins/rateLimit";
import loggerPlugin from "./plugins/logger";
import idempotencyPlugin from "./plugins/idempotency";

import authRoutes from "./modules/auth/auth.routes";
import walletRoutes from "./modules/wallet/wallet.routes";
import transactionRoutes from "./modules/transaction/transaction.routes";
import { ensureUserIndexes } from "./modules/user/user.model";
import { ensureWalletIndexes } from "./modules/wallet/wallet.model";
import { ensureTransactionIndexes } from "./modules/transaction/transaction.model";

export const createApp = async (): Promise<FastifyInstance> => {
  const app = buildFastify();

  await app.register(loggerPlugin);
  await app.register(mongoPlugin);
  await app.register(redisPlugin);
  await app.register(jwtPlugin);
  await app.register(securityPlugin);
  await app.register(rateLimitPlugin);
  await app.register(idempotencyPlugin);

  await ensureUserIndexes(app.mongo.db);
  await ensureWalletIndexes(app.mongo.db);
  await ensureTransactionIndexes(app.mongo.db);

  app.get("/health", async () => ({
    status: "ok",
    uptime: process.uptime(),
  }));

  await app.register(authRoutes, { prefix: "/api" });
  await app.register(walletRoutes, { prefix: "/api" });
  await app.register(transactionRoutes, { prefix: "/api" });

  return app;
};
