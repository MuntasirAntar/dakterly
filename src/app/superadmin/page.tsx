import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getSuperAdminDashboardData } from "@/lib/superadmin";
import AutoRefresh from "@/components/AutoRefresh";
import SuperAdminConsole from "@/components/SuperAdminConsole";

export const metadata: Metadata = { title: "Super Admin | Dakterly" };

export default async function SuperAdminPage() {
  const user = await requireRole("SUPER_ADMIN");
  const raw = await getSuperAdminDashboardData();

  const serialized = {
    currentUserId: user.id,
    today: raw.today,
    counts: raw.counts,
    clinics: raw.clinics.map((c) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      city: c.city,
      phone: c.phone,
      openTime: c.openTime,
      closeTime: c.closeTime,
      isActive: c.isActive,
      _count: c._count,
    })),
    clinicAdmins: raw.clinicAdmins.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      phone: a.phone,
      isActive: a.isActive,
      clinicId: a.clinicId,
      clinic: a.clinic,
    })),
    doctors: raw.doctors.map((d) => ({
      id: d.id,
      name: d.name,
      clinicId: d.clinicId,
      specialtyId: d.specialtyId,
      qualifications: d.qualifications,
      bio: d.bio,
      photoUrl: d.photoUrl ?? null,
      consultationFee: d.consultationFee,
      avgConsultMinutes: d.avgConsultMinutes,
      isActive: d.isActive,
      clinic: d.clinic,
      specialty: d.specialty,
    })),
    specialties: raw.specialties,
    users: raw.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive,
      clinicId: u.clinicId,
      createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
      clinic: u.clinic,
    })),
    auditLogs: raw.auditLogs.map((l) => ({
      id: l.id,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt),
      user: l.user,
    })),
    clinicInquiries: raw.clinicInquiries.map((q) => ({
      id: q.id,
      referenceId: q.referenceId,
      clinicName: q.clinicName,
      contactName: q.contactName,
      email: q.email,
      phone: q.phone,
      city: q.city,
      doctorCount: q.doctorCount ?? null,
      message: q.message ?? null,
      status: q.status,
      emailSent: Boolean(q.emailSent),
      createdAt: q.createdAt instanceof Date ? q.createdAt.toISOString() : String(q.createdAt),
    })),
  };

  return (
    <main className="flex-1 bg-slate-50">
      <AutoRefresh seconds={20} />
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="text-xs font-medium text-teal-700">Platform Administration · {user.email}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Super Admin Console</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage clinics, clinic admin accounts, doctor profiles &amp; portraits, user access, partnership requests, and audit logs.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <SuperAdminConsole data={serialized} />
      </div>
    </main>
  );
}
