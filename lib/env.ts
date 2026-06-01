import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    DATABASE_URL_UNPOOLED: z.url().optional(),
    AUTH_SECRET: z.string().min(32),
    AUTH_URL: z.url().optional(),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    PUSHER_APP_ID: z.string().optional(),
    PUSHER_KEY: z.string().optional(),
    PUSHER_SECRET: z.string().optional(),
    PUSHER_CLUSTER: z.string().optional(),
    REALTIME_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    SEED_ADMIN_EMAIL: z.email().optional(),
    SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    AI_GATEWAY_API_KEY: z.string().optional(),
    AI_MODEL_ID: z.string().default("anthropic/claude-sonnet-4-6"),
    VALYU_API_KEY: z.string().optional(),
    AI_DAILY_SPEND_CAP_USD: z.coerce.number().positive().default(5),
    CRON_SECRET: z.string().min(16).optional(),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    PUSHER_APP_ID: process.env.PUSHER_APP_ID,
    PUSHER_KEY: process.env.PUSHER_KEY,
    PUSHER_SECRET: process.env.PUSHER_SECRET,
    PUSHER_CLUSTER: process.env.PUSHER_CLUSTER,
    REALTIME_ENABLED: process.env.REALTIME_ENABLED,
    SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    AI_MODEL_ID: process.env.AI_MODEL_ID,
    VALYU_API_KEY: process.env.VALYU_API_KEY,
    AI_DAILY_SPEND_CAP_USD: process.env.AI_DAILY_SPEND_CAP_USD,
    CRON_SECRET: process.env.CRON_SECRET,
  },
  skipValidation:
    process.env.SKIP_ENV_VALIDATION === "true" ||
    !!process.env.CI ||
    process.env.npm_lifecycle_event === "lint",
  emptyStringAsUndefined: true,
});
