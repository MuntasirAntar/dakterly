import { PrismaClient } from "@prisma/client";
import { createMockPrismaClient } from "@/lib/mock-db";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createDbClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    return createMockPrismaClient();
  }
  try {
    return new PrismaClient();
  } catch {
    return createMockPrismaClient();
  }
}

export const db = globalForPrisma.prisma ?? createDbClient();

globalForPrisma.prisma = db;
