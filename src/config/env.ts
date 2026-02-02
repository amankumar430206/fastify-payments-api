import "dotenv/config";

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  mongoUri: string;
  redisUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  rateLimitMax: number;
  rateLimitTimeWindow: string;
  logLevel: "info" | "debug" | "warn" | "error";
  idempotencyTtlSeconds: number;
}

export const config: AppConfig = {
  nodeEnv: (process.env.NODE_ENV as any) || "development",
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGO_URI || "mongodb://mongo:27017/payments",
  redisUrl: process.env.REDIS_URL || "redis://redis:6379",
  jwtSecret: process.env.JWT_SECRET || "change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 100,
  rateLimitTimeWindow: process.env.RATE_LIMIT_WINDOW || "1 minute",
  logLevel: (process.env.LOG_LEVEL as any) || "info",
  idempotencyTtlSeconds: Number(process.env.IDEMPOTENCY_TTL) || 3600,
};
