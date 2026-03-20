import { z } from "zod";

const EnvSchema = z.object({
  // Database (phase 2, optional for MVP)
  DATABASE_URL: z.string().optional(),

  // Cloudflare R2
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_BUCKET: z.string(),
  R2_ENDPOINT: z.string(),
  R2_PUBLIC_URL: z.string(),

  // OpenAI-compatible text generation
  OPENAI_API_KEY: z.string(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),

  // Base paths for data
  DATA_BASE_PATH: z.string().default("data"),
});

let cachedEnv: z.infer<typeof EnvSchema> | null = null;

export function getEnv() {
  if (cachedEnv) return cachedEnv;
  const parsed = EnvSchema.parse(process.env);
  cachedEnv = parsed;
  return parsed;
}

