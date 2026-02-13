import { defineConfig, env } from "prisma/config";
import dotenv from "dotenv";
import path from "path";

// Load .env.local first so its DATABASE_URL wins (dotenv doesn't override existing vars when loading .env)
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

export default defineConfig({
  schema: "src/prisma/schema.prisma",
  migrations: {
    path: "src/prisma/migrations",
    seed: `tsx src/prisma/seed.ts`
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/db",
    directUrl: process.env.DIRECT_URL,
  },
});
