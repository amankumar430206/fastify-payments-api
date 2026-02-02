import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config/env";

const IDEMPOTENCY_HEADER = "idempotency-key";

declare module "fastify" {
  interface FastifyRequest {
    idempotencyKey?: string;
  }
}

interface StoredResponse {
  statusCode: number;
  body: any;
}

export default fp(async (app: FastifyInstance) => {
  app.addHook("preHandler", async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.method === "GET" || req.method === "OPTIONS") return;

    const key = req.headers[IDEMPOTENCY_HEADER] as string | undefined;
    if (!key) return;

    req.idempotencyKey = key;
    const redisKey = `idem:${key}`;

    const cached = await app.redis.get(redisKey);
    if (cached) {
      const parsed = JSON.parse(cached) as StoredResponse;
      reply.code(parsed.statusCode).send(parsed.body);
      return reply; // short‑circuit handler
    }

    // Mark as processing (optional).
    await app.redis.setEx(
      redisKey,
      config.idempotencyTtlSeconds,
      JSON.stringify({ statusCode: 102, body: { status: "processing" } }),
    );
  });

  app.addHook("onSend", async (req, reply, payload) => {
    if (!req.idempotencyKey) return payload;

    const redisKey = `idem:${req.idempotencyKey}`;
    if (reply.statusCode >= 200 && reply.statusCode < 300) {
      const toStore: StoredResponse = {
        statusCode: reply.statusCode,
        body: payload,
      };
      await app.redis.setEx(redisKey, config.idempotencyTtlSeconds, JSON.stringify(toStore));
    }

    return payload;
  });
});
