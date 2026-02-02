import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import fastifyHelmet from "@fastify/helmet";

export default fp(async (app: FastifyInstance) => {
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
  });
});
