import fp from "fastify-plugin";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { MongoClient, Db } from "mongodb";
import { config } from "../config/env";

declare module "fastify" {
  interface FastifyInstance {
    mongo: {
      client: MongoClient;
      db: Db;
    };
  }
}

const mongoPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
  const client = new MongoClient(config.mongoUri);
  await client.connect();
  const db = client.db();

  app.decorate("mongo", { client, db });

  app.addHook("onClose", async () => {
    await client.close();
  });
};

export default fp(mongoPlugin, { name: "mongo-plugin" });
