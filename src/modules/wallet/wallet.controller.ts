import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendSuccess, sendError } from "../../utils/reply";
import type { CreateWalletBody } from "./wallet.types";
import type { WalletOperationBody } from "../transaction/transaction.types";
import { WalletService } from "./wallet.service";

export const walletController = (app: FastifyInstance) => {
  const service = new WalletService(app);

  return {
    createWallet: async (req: FastifyRequest<{ Body: CreateWalletBody }>, reply: FastifyReply) => {
      try {
        const userId = req.user!.sub;
        const wallet = await service.createWallet(userId, req.body.currency);
        return sendSuccess(reply, 201, wallet);
      } catch (err) {
        return sendError(reply, err);
      }
    },

    credit: async (req: FastifyRequest<{ Body: WalletOperationBody }>, reply: FastifyReply) => {
      try {
        const userId = req.user!.sub;
        const { walletId, amount, metadata } = req.body;
        const res = await service.changeBalance(userId, walletId, amount, "credit", metadata);
        return sendSuccess(reply, 200, res);
      } catch (err) {
        return sendError(reply, err);
      }
    },

    debit: async (req: FastifyRequest<{ Body: WalletOperationBody }>, reply: FastifyReply) => {
      try {
        const userId = req.user!.sub;
        const { walletId, amount, metadata } = req.body;
        const res = await service.changeBalance(userId, walletId, amount, "debit", metadata);
        return sendSuccess(reply, 200, res);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  };
};
