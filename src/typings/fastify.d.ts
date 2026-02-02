import "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
  }

  interface FastifyRequest {
    user?: {
      sub: string;
      role: "user" | "admin";
    };
    idempotencyKey?: string;
    requestId: string;
  }
}
