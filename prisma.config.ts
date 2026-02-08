import { defineConfig } from "prisma/config";
import 'dotenv/config'

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
