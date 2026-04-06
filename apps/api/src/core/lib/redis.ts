import { Redis } from "ioredis";
import { env } from "../../config/env.js";

/**
 * Shared Redis connection for BullMQ and future rate limiting.
 * `maxRetriesPerRequest: null` is required by BullMQ for blocking commands.
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  family: 4,
  keepAlive: 10000,
});
