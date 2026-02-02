import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { randomUUID } from "crypto";

declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
  }
}

export default fp(async (app: FastifyInstance) => {
  app.addHook("onRequest", async (req) => {
    const rid = (req.headers["x-request-id"] as string) || randomUUID();
    req.requestId = rid;
    req.log = req.log.child({ requestId: rid });
  });

  app.addHook("onResponse", async (req, reply) => {
    req.log.info(
      {
        statusCode: reply.statusCode,
        url: req.url,
        method: req.method,
      },
      "request completed",
    );
  });
});
