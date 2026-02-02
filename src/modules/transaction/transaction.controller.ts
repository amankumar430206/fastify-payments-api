import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendSuccess, sendError } from "../../utils/reply";
import { WalletService } from "../wallet/wallet.service";
import type { TransactionHistoryQuery } from "./transaction.types";

export const transactionController = (app: FastifyInstance) => {
  const service = new WalletService(app);

  return {
    history: async (req: FastifyRequest<{ Querystring: TransactionHistoryQuery }>, reply: FastifyReply) => {
      try {
        const userId = req.user!.sub;
        const { walletId, limit = 20, cursor } = req.query;

        const cacheKey = `wallet:${walletId}:tx:${limit}:${cursor || "null"}`;
        const cached = await app.redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          return sendSuccess(reply, 200, parsed);
        }

        const res = await service.getTransactions(userId, walletId, limit, cursor);
        await app.redis.setEx(cacheKey, 30, JSON.stringify(res));

        return sendSuccess(reply, 200, res);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  };
};
