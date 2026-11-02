import "server-only";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "@server/core/config/env";
import { QUEUE_NAMES, type QueueName } from "@shared/contracts/jobs";

// Producers only. Durable work runs in /workers, never inside the request.
const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
const queues = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, { connection });
    queues.set(name, q);
  }
  return q;
}

export { QUEUE_NAMES };
