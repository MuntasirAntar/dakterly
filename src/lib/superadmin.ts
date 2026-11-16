import { db } from "@/lib/db";
import { nowInClinicTz } from "@/lib/time";

export async function getSuperAdminDashboardData(userQuery?: string) {
  const today = nowInClinicTz().date;
  const q = userQuery?.trim() ?? "";

  const [
    clinics,
    doctors,
    specialties,
    clinicAdmins,
    users,
    patientCount,
    todayAppointmentCount,
    auditLogs,
  ] = await Promise.all([
    db.clinic.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { doctors: true, staff: true } } },
    }),
    db.doctor.findMany({
      orderBy: { name: "asc" },
      include: {
        clinic: { select: { id: true, name: true } },
        specialty: { select: { id: true, name: true } },
        schedules: { orderBy: { weekday: "asc" } },
      },
    }),
    db.specialty.findMany({
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { role: "CLINIC_ADMIN" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        clinicId: true,
        createdAt: true,
        clinic: { select: { id: true, name: true } },
      },
    }),
    db.user.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        clinicId: true,
        createdAt: true,
        clinic: { select: { id: true, name: true } },
      },
    }),
    db.user.count({ where: { role: "PATIENT" } }),
    db.appointment.count({ where: { date: today, status: { not: "CANCELLED" } } }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
    }),
  ]);

  return {
    today,
    counts: {
      clinics: clinics.length,
      activeClinics: clinics.filter((c) => c.isActive).length,
      doctors: doctors.length,
      activeDoctors: doctors.filter((d) => d.isActive).length,
      patients: patientCount,
      todayAppointments: todayAppointmentCount,
    },
    clinics,
    doctors,
    specialties,
    clinicAdmins,
    users,
    auditLogs,
  };
}
