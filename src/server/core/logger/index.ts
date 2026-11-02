import "server-only";
import pino from "pino";
import { env } from "@server/core/config/env";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: ["req.headers.authorization", "req.headers.cookie", "*.token", "*.password"],
});
