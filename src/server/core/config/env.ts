import "server-only";
import { z } from "zod";

// COS-002: typed env. App fails fast if required config is missing.
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type Env = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // Only print key names, never values.
  const keys = Object.keys(parsed.error.flatten().fieldErrors).join(", ");
  throw new Error(`Invalid or missing environment variables: ${keys}`);
}

export const env: Env = parsed.data;
