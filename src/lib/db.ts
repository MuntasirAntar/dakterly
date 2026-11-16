import { PrismaClient } from "@prisma/client";
import { createMockPrismaClient } from "@/lib/mock-db";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPostgresClient(): PrismaClient {
  const base = new PrismaClient();
  let schemaReady: Promise<void> | null = null;

  const ensureSchema = () => {
    if (!schemaReady) {
      schemaReady = base
        .$executeRawUnsafe('ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT')
        .then(() => undefined)
        .catch(() => {
          schemaReady = null;
        });
    }
    return schemaReady;
  };

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          await ensureSchema();
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}

function createDbClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    return createMockPrismaClient();
  }
  try {
    return createPostgresClient();
  } catch {
    return createMockPrismaClient();
  }
}

export const db = globalForPrisma.prisma ?? createDbClient();

globalForPrisma.prisma = db;
