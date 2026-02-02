import { createApp } from "./app";
import { config } from "./config/env";
import { startWorker } from "./jobs/queue";

const start = async () => {
  const app = await createApp();

  startWorker(app);

  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    app.log.info(`Server listening on ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
