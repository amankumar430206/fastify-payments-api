import type { Db, Collection, WithId, Document } from "mongodb";

export interface UserDocument extends WithId<Document> {
  email: string;
  passwordHash: string;
  role: "user" | "admin";
  createdAt: Date;
}

export const getUserCollection = (db: Db): Collection<UserDocument> => db.collection<UserDocument>("users");

export const ensureUserIndexes = async (db: Db) => {
  const col = getUserCollection(db);
  await col.createIndex({ email: 1 }, { unique: true });
};
