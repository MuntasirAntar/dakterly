-- CreateTable
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
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DoctorRemovalRequest_status_createdAt_idx" ON "DoctorRemovalRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DoctorRemovalRequest_clinicId_idx" ON "DoctorRemovalRequest"("clinicId");
