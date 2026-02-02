import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { config } from "../config/env";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
  }

  interface FastifyRequest {
    user?: {
      sub: string;
      role: "user" | "admin";
    };
  }
}

export default fp(async (app: FastifyInstance) => {
  await app.register(fastifyJwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.jwtExpiresIn },
  });

  app.decorate("authenticate", async (request: any, reply: any): Promise<void> => {
    try {
      const decoded = await request.jwtVerify();
      request.user = decoded;
    } catch (err) {
      reply.code(401).send({ message: "Unauthorized" });
    }
  });
});
