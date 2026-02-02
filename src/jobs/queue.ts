import type { FastifyInstance } from "fastify";
import { NotificationJob } from "./notification.job"; // ← Add this import

export interface JobPayload {
  type: "notification";
  payload: {
    userId: string;
    channel: "email" | "webhook";
    message: string;
  };
}

const QUEUE_KEY = "jobs:default";

export const enqueueJob = async (app: FastifyInstance, job: JobPayload) => {
  await app.redis.lPush(QUEUE_KEY, JSON.stringify(job));
};

export const startWorker = (app: FastifyInstance) => {
  const processJob = async () => {
    try {
      const res = await app.redis.brPop(QUEUE_KEY, 5);
      if (!res) return;
      const [, raw] = res;
      const job = JSON.parse(raw) as JobPayload;
      await handleJob(app, job); // ← Calls notification job here
    } catch (err) {
      app.log.error({ err }, "Job processing error");
    }
  };

  const loop = async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await processJob();
    }
  };

  loop().catch((err) => app.log.error({ err }, "Worker loop crashed"));
};

const handleJob = async (app: FastifyInstance, job: JobPayload) => {
  if (job.type === "notification") {
    const notificationJob = new NotificationJob(app); // ← Instantiate here
    await notificationJob.send(job.payload); // ← Execute job
  }
};
