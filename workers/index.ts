import { Worker } from "bullmq";
import IORedis from "ioredis";
import { QUEUE_NAMES } from "@shared/contracts/jobs";
import { processEmail } from "./processors/email.processor";

// Separate long-running process (spec §4: Redis + BullMQ). Run: npm run worker
const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });

const workers = [new Worker(QUEUE_NAMES.email, processEmail, { connection })];

for (const w of workers) {
  w.on("failed", (job, err) => console.error(`[${w.name}] job ${job?.id} failed:`, err.message));
}

async function shutdown() {
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
console.log("workers started:", workers.map((w) => w.name).join(", "));
