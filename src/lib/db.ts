import { PrismaClient } from "@prisma/client";
import { createMockPrismaClient } from "@/lib/mock-db";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createDbClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    return createMockPrismaClient();
  }

  let realClient: PrismaClient | null = null;
  try {
    realClient = new PrismaClient();
  } catch (err) {
    console.warn("[Dakterly] Failed to initialize PrismaClient, falling back to mock DB:", err);
    return createMockPrismaClient();
  }

  // Create a lazy mock client fallback in case the database connection or tables are not available on Vercel
  let mockClient: PrismaClient | null = null;
  const getMock = () => {
    if (!mockClient) {
      mockClient = createMockPrismaClient();
    }
    return mockClient;
  };

  // Return a Proxy around realClient that falls back to mockClient on connection/schema failures
  return new Proxy(realClient, {
    get(target, prop, receiver) {
      const orig = Reflect.get(target, prop, receiver);
      if (typeof orig === "object" && orig !== null) {
        return new Proxy(orig, {
          get(modelTarget, modelProp) {
            const method = Reflect.get(modelTarget, modelProp);
            if (typeof method === "function") {
              return async (...args: unknown[]) => {
                try {
                  return await (method as (...a: unknown[]) => Promise<unknown>).apply(modelTarget, args);
                } catch (error: unknown) {
                  const msg = error instanceof Error ? error.message : String(error);
                  console.warn(`[Dakterly DB Warning] Prisma query failed (${String(prop)}.${String(modelProp)}): ${msg}. Falling back to embedded dataset.`);
                  const mockModel = Reflect.get(getMock(), prop) as Record<string, unknown> | undefined;
                  const fallbackFn = mockModel?.[String(modelProp)];
                  if (typeof fallbackFn === "function") {
                    return await (fallbackFn as (...a: unknown[]) => Promise<unknown>).apply(mockModel, args);
                  }
                  throw error;
                }
              };
            }
            return method;
          },
        });
      }
      return orig;
    },
  });
}

export const db = globalForPrisma.prisma ?? createDbClient();

globalForPrisma.prisma = db;

