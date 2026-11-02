import type { Job } from "bullmq";

// Must be idempotent: jobs can be retried.
export async function processEmail(job: Job<{ notificationId: string }>) {
  console.log("send email for notification", job.data.notificationId);
}
