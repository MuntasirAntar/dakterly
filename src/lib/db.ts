import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { createMockPrismaClient } from "@/lib/mock-db";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPostgresClient(): PrismaClient {
  const base = new PrismaClient();
  let schemaReady: Promise<void> | null = null;

  const ensureSchema = () => {
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
        await base.$executeRaw`
          INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "isActive", "mustChangePassword")
          VALUES ('superadmin_default', 'Super Admin', 'superadmin@example.com', ${superHash}, 'SUPER_ADMIN', true, false)
          ON CONFLICT ("email") DO UPDATE
          SET "passwordHash" = EXCLUDED."passwordHash", "isActive" = true
        `;
      })().catch(() => {
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
