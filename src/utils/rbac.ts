import type { FastifyRequest, FastifyReply } from "fastify";
import { UnauthorizedError } from "./errors";

export type Role = "user" | "admin";

export const requireRole =
  (roles: Role[]) =>
  async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = req.user;
    if (!user || !roles.includes(user.role)) {
      throw new UnauthorizedError("Insufficient permissions");
    }
  };
