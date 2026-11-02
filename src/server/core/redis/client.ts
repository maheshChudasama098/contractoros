import "server-only";
import IORedis from "ioredis";
import { env } from "@server/core/config/env";

// Shared connection for request-path features (rate limiting). BullMQ keeps its own.
const globalForRedis = globalThis as unknown as { redis?: IORedis };

export const redis =
  globalForRedis.redis ??
  new IORedis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });

if (env.NODE_ENV !== "production") globalForRedis.redis = redis;
