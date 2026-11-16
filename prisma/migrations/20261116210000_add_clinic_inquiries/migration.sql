-- CreateTable
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
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ClinicInquiry_referenceId_key" ON "ClinicInquiry"("referenceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClinicInquiry_status_createdAt_idx" ON "ClinicInquiry"("status", "createdAt");
