import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendSuccess, sendError } from "../../utils/reply";
import { AuthService } from "./auth.service";
import type { RegisterBody, LoginBody } from "./auth.types";

export const authController = (app: FastifyInstance) => {
  const service = new AuthService(app);

  return {
    register: async (request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) => {
      try {
        const { email, password } = request.body;
        const token = await service.register(email, password);
        return sendSuccess(reply, 201, { accessToken: token });
      } catch (err) {
        return sendError(reply, err);
      }
    },

    login: async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      try {
        const { email, password } = request.body;
        const token = await service.login(email, password);
        return sendSuccess(reply, 200, { accessToken: token });
      } catch (err) {
        return sendError(reply, err);
      }
    },
  };
};
