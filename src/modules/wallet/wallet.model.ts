import type { Db, Collection, WithId, Document } from "mongodb";

export interface WalletDocument extends WithId<Document> {
  userId: string;
  currency: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export const getWalletCollection = (db: Db): Collection<WalletDocument> => db.collection<WalletDocument>("wallets");

export const ensureWalletIndexes = async (db: Db) => {
  const col = getWalletCollection(db);
  await col.createIndex({ userId: 1, currency: 1 }, { unique: true });
};
