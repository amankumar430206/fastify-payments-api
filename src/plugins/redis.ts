import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createClient, RedisClientType } from "redis";
import { config } from "../config/env";

declare module "fastify" {
  interface FastifyInstance {
    redis: RedisClientType;
  }
}

// Fastify plugin to integrate Redis client
export default fp(async (app: FastifyInstance) => {
  const client: RedisClientType = createClient({ url: config.redisUrl });
  client.on("error", (err) => app.log.error({ err }, "Redis error"));

  // connect to Redis server
  await client.connect();
  app.decorate("redis", client);

  // notify Redis client to disconnect when Fastify closes
  app.addHook("onClose", async () => {
    await client.close();
  });
});
