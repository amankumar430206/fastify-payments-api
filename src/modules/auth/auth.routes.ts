import type { FastifyInstance } from "fastify";
import { authController } from "./auth.controller";
import { registerSchema, loginSchema } from "./auth.schemas";

export default async function authRoutes(app: FastifyInstance) {
  const controller = authController(app);

  app.post("/auth/register", { schema: registerSchema }, controller.register);
  app.post("/auth/login", { schema: loginSchema }, controller.login);
}
