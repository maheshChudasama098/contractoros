export const QUEUE_NAMES = {
  email: "email",
  pdf: "pdf",
  quickbooksSync: "quickbooks-sync",
  webhooks: "webhooks",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
