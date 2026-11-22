import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { createMockPrismaClient } from "@/lib/mock-db";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function shouldFallbackToMock(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = "name" in err ? String((err as { name?: unknown }).name) : "";
  const code = "code" in err ? String((err as { code?: unknown }).code) : "";
  const message = "message" in err ? String((err as { message?: unknown }).message) : "";
  if (name === "PrismaClientInitializationError") return true;
  if (/^P10(00|01|02|03|08|11|17)$/.test(code)) return true;
  if (code === "P2021" || code === "P2022" || code === "42P01") return true;
  return /Authentication failed|Can't reach database server|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|does not exist in the current database|relation .* does not exist/i.test(
    message,
  );
}

function createPostgresClient(): PrismaClient {
  const base = new PrismaClient();
  let schemaReady: Promise<boolean> | null = null;
  let mockFallback: PrismaClient | null = null;

  const getMock = () => {
    if (!mockFallback) {
      mockFallback = createMockPrismaClient();
    }
    return mockFallback;
  };

  const ensureSchema = (): Promise<boolean> => {
    if (!schemaReady) {
      const superPw = process.env.SUPERADMIN_PASSWORD || "SuperAdmin@12345";
      const superHash = bcrypt.hashSync(superPw, 10);
      schemaReady = (async () => {
        await base.$executeRawUnsafe('ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT');
        await base.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "ClinicInquiry" (
            "id" TEXT NOT NULL,
            "referenceId" TEXT NOT NULL,
            "clinicName" TEXT NOT NULL,
            "contactName" TEXT NOT NULL,
            "email" TEXT NOT NULL,
            "phone" TEXT NOT NULL,
            "city" TEXT NOT NULL,
            "doctorCount" TEXT,
            "message" TEXT,
            "status" TEXT NOT NULL DEFAULT 'NEW',
            "emailSent" BOOLEAN NOT NULL DEFAULT false,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ClinicInquiry_pkey" PRIMARY KEY ("id")
          )
        `);
        await base.$executeRawUnsafe(
          'CREATE UNIQUE INDEX IF NOT EXISTS "ClinicInquiry_referenceId_key" ON "ClinicInquiry"("referenceId")',
        );
        await base.$executeRawUnsafe(
          'CREATE INDEX IF NOT EXISTS "ClinicInquiry_status_createdAt_idx" ON "ClinicInquiry"("status", "createdAt")',
        );
        await base.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "DoctorRemovalRequest" (
            "id" TEXT NOT NULL,
            "doctorId" TEXT NOT NULL,
            "doctorName" TEXT NOT NULL,
            "specialty" TEXT NOT NULL,
            "clinicId" TEXT NOT NULL,
            "clinicName" TEXT NOT NULL,
            "requestedBy" TEXT NOT NULL,
            "reason" TEXT,
            "status" TEXT NOT NULL DEFAULT 'PENDING',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "DoctorRemovalRequest_pkey" PRIMARY KEY ("id")
          )
        `);
        await base.$executeRawUnsafe(
          'CREATE INDEX IF NOT EXISTS "DoctorRemovalRequest_status_createdAt_idx" ON "DoctorRemovalRequest"("status", "createdAt")',
        );
        await base.$executeRawUnsafe(
          'CREATE INDEX IF NOT EXISTS "DoctorRemovalRequest_clinicId_idx" ON "DoctorRemovalRequest"("clinicId")',
        );
        await base.$executeRaw`
          INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "isActive", "mustChangePassword")
          VALUES ('superadmin_default', 'Super Admin', 'superadmin@example.com', ${superHash}, 'SUPER_ADMIN', true, false)
          ON CONFLICT ("email") DO UPDATE
          SET "passwordHash" = EXCLUDED."passwordHash", "isActive" = true
        `;
        return true;
      })().catch((err) => {
        if (shouldFallbackToMock(err)) {
          console.warn("[Dakterly] PostgreSQL unavailable or schema not migrated yet — using mock database.");
          return false;
        }
        schemaReady = null;
        return true;
      });
    }
    return schemaReady;
  };

  const runOnMock = (model: string, operation: string, args: unknown) => {
    const mock = getMock() as unknown as Record<string, Record<string, (a: unknown) => Promise<unknown>>>;
    const key = model.charAt(0).toLowerCase() + model.slice(1);
    const fn = mock[key]?.[operation];
    if (typeof fn === "function") {
      return fn(args);
    }
    throw new Error(`Unsupported mock operation: ${key}.${operation}`);
  };

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (mockFallback) {
            return runOnMock(model, operation, args);
          }
          const ok = await ensureSchema();
          if (!ok) {
            return runOnMock(model, operation, args);
          }
          try {
            return await query(args);
          } catch (err) {
            if (shouldFallbackToMock(err)) {
              console.warn("[Dakterly] PostgreSQL query failed or table missing — falling back to mock database.");
              return runOnMock(model, operation, args);
            }
            throw err;
          }
        },
      },
    },
  }) as unknown as PrismaClient;
}

function createDbClient(): PrismaClient {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || (!url.startsWith("postgres://") && !url.startsWith("postgresql://"))) {
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
