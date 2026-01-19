import { defineConfig, env } from "prisma/config";
import 'dotenv/config'

export default defineConfig({
  schema: "src/prisma/schema.prisma",
  migrations: {
    path: "src/prisma/migrations",
    seed: `tsx src/prisma/seed.ts`
  },
  engine: "classic",
  datasource: {
    url: env('DATABASE_URL') ?? "postgresql://user:pass@localhost:5432/db",
  },
});
