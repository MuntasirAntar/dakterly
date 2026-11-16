"use client";

import { type FormEvent, useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  FileSpreadsheet,
  KeyRound,
  Plus,
  Search,
  ShieldAlert,
  Stethoscope,
  Upload,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import {
  createClinicAction,
  createClinicAdminAction,
  importDoctorsCsvAction,
  resetUserPasswordAction,
  toggleClinicActiveAction,
  toggleUserActiveAction,
  updateClinicAction,
  type AdminActionState,
} from "@/app/actions/superadmin";
import DoctorAvatar from "@/components/DoctorAvatar";
import { formatFee } from "@/lib/format";

export type SuperAdminData = {
  currentUserId: string;
  today: string;
  counts: {
    clinics: number;
    activeClinics: number;
    doctors: number;
    activeDoctors: number;
    patients: number;
    todayAppointments: number;
  };
  clinics: Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string | null;
    openTime: string;
    closeTime: string;
    isActive: boolean;
    _count: { doctors: number; staff: number };
  }>;
  clinicAdmins: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    isActive: boolean;
    clinicId: string | null;
    clinic: { id: string; name: string } | null;
  }>;
  doctors: Array<{
    id: string;
    name: string;
    clinicId: string;
    specialtyId: string;
    qualifications: string | null;
    bio: string | null;
    photoUrl: string | null;
    consultationFee: number;
    avgConsultMinutes: number;
    isActive: boolean;
    clinic: { id: string; name: string };
    specialty: { id: string; name: string };
  }>;
  specialties: Array<{ id: string; name: string }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    isActive: boolean;
    clinicId: string | null;
    createdAt: string;
    clinic: { id: string; name: string } | null;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    createdAt: string;
    user: { name: string; email: string; role: string } | null;
  }>;
};

type TabId = "clinics" | "admins" | "doctors" | "users" | "audit";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20";

function ActionFeedback({ state }: { state: AdminActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {state.message}
      </p>
    );
  }
  return null;
}

function StatusTag({ active, activeLabel = "Active", inactiveLabel = "Disabled" }: { active: boolean; activeLabel?: string; inactiveLabel?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
        active ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

export default function SuperAdminConsole({ data }: { data: SuperAdminData }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("clinics");
  const [editingClinicId, setEditingClinicId] = useState<string | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [csvDraft, setCsvDraft] = useState("");

  const [createDoctorState, setCreateDoctorState] = useState<AdminActionState>({});
  const [createDoctorPending, setCreateDoctorPending] = useState(false);
  const [createPhotoPreview, setCreatePhotoPreview] = useState<string | null>(null);

  const [updateDoctorState, setUpdateDoctorState] = useState<AdminActionState>({});
  const [updateDoctorPending, setUpdateDoctorPending] = useState(false);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);

  const [createClinicState, createClinicFormAction, createClinicPending] = useActionState(createClinicAction, {});
  const [updateClinicState, updateClinicFormAction, updateClinicPending] = useActionState(updateClinicAction, {});
  const [createAdminState, createAdminFormAction, createAdminPending] = useActionState(createClinicAdminAction, {});
  const [resetPwState, resetPwFormAction, resetPwPending] = useActionState(resetUserPasswordAction, {});
  const [csvState, csvFormAction, csvPending] = useActionState(importDoctorsCsvAction, {});

  async function handleCreateDoctorSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("photo");
    if (file instanceof File && file.size > 5 * 1024 * 1024) {
      setCreateDoctorState({ ok: false, error: "Doctor photo must be smaller than 5 MB." });
      return;
    }

    setCreateDoctorPending(true);
    setCreateDoctorState({});
    try {
      const res = await fetch("/api/superadmin/doctors", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !json.ok) {
        setCreateDoctorState({ ok: false, error: json.error ?? "Failed to add doctor." });
        return;
      }
      setCreateDoctorState({ ok: true, message: json.message ?? "Doctor added." });
      form.reset();
      if (createPhotoPreview) {
        URL.revokeObjectURL(createPhotoPreview);
        setCreatePhotoPreview(null);
      }
      router.refresh();
    } catch {
      setCreateDoctorState({ ok: false, error: "Upload failed. Please check the image file and try again." });
    } finally {
      setCreateDoctorPending(false);
    }
  }

  async function handleUpdateDoctorSubmit(e: FormEvent<HTMLFormElement>, doctorId: string) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("photo");
    if (file instanceof File && file.size > 5 * 1024 * 1024) {
      setUpdateDoctorState({ ok: false, error: "Doctor photo must be smaller than 5 MB." });
      return;
    }

    setUpdateDoctorPending(true);
    setUpdateDoctorState({});
    try {
      const res = await fetch(`/api/superadmin/doctors/${doctorId}`, {
        method: "PATCH",
        body: formData,
      });
      const json = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !json.ok) {
        setUpdateDoctorState({ ok: false, error: json.error ?? "Failed to update doctor." });
        return;
      }
      setUpdateDoctorState({ ok: true, message: json.message ?? "Doctor updated." });
      if (editPhotoPreview) {
        URL.revokeObjectURL(editPhotoPreview);
        setEditPhotoPreview(null);
      }
      setEditingDoctorId(null);
      router.refresh();
    } catch {
      setUpdateDoctorState({ ok: false, error: "Update failed. Please check the image file and try again." });
    } finally {
      setUpdateDoctorPending(false);
    }
  }

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.clinic?.name.toLowerCase().includes(q) ?? false),
    );
  }, [data.users, userSearch]);

  const tabs: Array<{ id: TabId; label: string; count?: number; icon: typeof Building2 }> = [
    { id: "clinics", label: "Clinics", count: data.clinics.length, icon: Building2 },
    { id: "admins", label: "Clinic Admins", count: data.clinicAdmins.length, icon: UserCog },
    { id: "doctors", label: "Doctors & Photos", count: data.doctors.length, icon: Stethoscope },
    { id: "users", label: "Users", count: data.users.length, icon: Users },
    { id: "audit", label: "Activity Log", count: data.auditLogs.length, icon: Activity },
  ];

  const sampleCsv = [
    "name,clinicName,specialty,qualifications,consultationFee,avgConsultMinutes,bio",
    `Dr. Nadia Islam,${data.clinics[0]?.name ?? "Green Crescent Medical Center"},Cardiologist,"MBBS, MD",1400,15,Senior heart specialist focused on preventive care.`,
    `Dr. Tariq Hasan,${data.clinics[0]?.name ?? "Green Crescent Medical Center"},Dermatologist,"MBBS, DDV",1000,10,Clinical dermatologist for adult and pediatric skin care.`,
  ].join("\n");

  const stats = [
    { label: "Clinics", value: data.counts.clinics, sub: `${data.counts.activeClinics} active` },
    { label: "Doctors", value: data.counts.doctors, sub: `${data.counts.activeDoctors} active` },
    { label: "Patients", value: data.counts.patients, sub: "Registered accounts" },
    { label: "Today's Appointments", value: data.counts.todayAppointments, sub: data.today },
  ];

  return (
    <div className="space-y-6">
      {/* Overview metrics strip */}
      <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
            <dt className="text-xs font-medium text-slate-500">{stat.label}</dt>
            <dd className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums sm:text-2xl">{stat.value}</dd>
            <p className="mt-0.5 truncate text-xs text-slate-500 tabular-nums">{stat.sub}</p>
          </div>
        ))}
      </dl>

      {/* Section tabs */}
      <div className="flex gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm sm:flex-wrap" role="tablist">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all duration-150 ${
                active
                  ? "bg-teal-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-teal-50 hover:text-teal-900"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span className={`font-mono text-xs tabular-nums ${active ? "text-emerald-200" : "text-slate-400"}`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: CLINICS */}
      {tab === "clinics" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Plus className="h-4 w-4 text-teal-700" aria-hidden="true" />
              Add new clinic
            </h2>
            <p className="mt-1 text-xs text-slate-500">Create a partner clinic before linking its receptionist account.</p>

            <form action={createClinicFormAction} className="mt-4 space-y-3">
              <ActionFeedback state={createClinicState} />
              <label className="block text-xs font-medium text-slate-700">
                Clinic name
                <input name="name" required placeholder="e.g. Crescent City Clinic" className={inputClass} />
              </label>
              <label className="block text-xs font-medium text-slate-700">
                Address
                <input name="address" required placeholder="House 14, Road 7, Banani" className={inputClass} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-slate-700">
                  City
                  <input name="city" required placeholder="Dhaka" className={inputClass} />
                </label>
                <label className="block text-xs font-medium text-slate-700">
                  Phone
                  <input name="phone" placeholder="01700-000010" className={inputClass} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-slate-700">
                  Opens
                  <input name="openTime" defaultValue="09:00" className={inputClass} />
                </label>
                <label className="block text-xs font-medium text-slate-700">
                  Closes
                  <input name="closeTime" defaultValue="21:00" className={inputClass} />
                </label>
              </div>
              <button
                type="submit"
                disabled={createClinicPending}
                className="w-full rounded-lg bg-teal-700 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
              >
                {createClinicPending ? "Creating..." : "Create clinic"}
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-8">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">All clinics</h2>
              <p className="text-xs text-slate-500">Edit clinic details or deactivate/reactivate visibility.</p>
            </div>
            <div className="p-4">
              <ActionFeedback state={updateClinicState} />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-left text-sm">
                <thead className="border-y border-slate-200 bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Clinic</th>
                    <th className="px-4 py-2.5 font-semibold">City &amp; Hours</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Doctors</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.clinics.map((clinic) => (
                    <tr key={clinic.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{clinic.name}</p>
                        <p className="text-xs text-slate-500">{clinic.address}</p>
                        {clinic.phone && <p className="font-mono text-xs text-slate-500 tabular-nums">{clinic.phone}</p>}
                        {editingClinicId === clinic.id && (
                          <form action={updateClinicFormAction} className="mt-3 space-y-2 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
                            <input type="hidden" name="clinicId" value={clinic.id} />
                            <input name="name" defaultValue={clinic.name} required className={inputClass} aria-label="Clinic name" />
                            <input name="address" defaultValue={clinic.address} required className={inputClass} aria-label="Clinic address" />
                            <div className="grid grid-cols-2 gap-2">
                              <input name="city" defaultValue={clinic.city} required className={inputClass} aria-label="City" />
                              <input name="phone" defaultValue={clinic.phone ?? ""} placeholder="Phone" className={inputClass} aria-label="Phone" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input name="openTime" defaultValue={clinic.openTime} className={inputClass} aria-label="Open time" />
                              <input name="closeTime" defaultValue={clinic.closeTime} className={inputClass} aria-label="Close time" />
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={updateClinicPending}
                                className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingClinicId(null)}
                                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                              >
                                Close
                              </button>
                            </div>
                          </form>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <p>{clinic.city}</p>
                        <p className="font-mono text-xs text-slate-500 tabular-nums">
                          {clinic.openTime}–{clinic.closeTime}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums">
                        {clinic._count.doctors}
                      </td>
                      <td className="px-4 py-3">
                        <StatusTag active={clinic.isActive} activeLabel="Active" inactiveLabel="Deactivated" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingClinicId(editingClinicId === clinic.id ? null : clinic.id)}
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <form action={toggleClinicActiveAction}>
                            <input type="hidden" name="clinicId" value={clinic.id} />
                            <input type="hidden" name="nextActive" value={clinic.isActive ? "false" : "true"} />
                            <button
                              type="submit"
                              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                                clinic.isActive
                                  ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                  : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {clinic.isActive ? "Deactivate" : "Reactivate"}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: CLINIC ADMINS */}
      {tab === "admins" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <UserCog className="h-4 w-4 text-teal-700" aria-hidden="true" />
              Create clinic receptionist login
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Each clinic admin is strictly scoped to their assigned clinic&apos;s dashboard and appointments.
            </p>

            <form action={createAdminFormAction} className="mt-4 space-y-3">
              <ActionFeedback state={createAdminState} />
              <label className="block text-xs font-medium text-slate-700">
                Assign to clinic
                <select name="clinicId" required className={inputClass}>
                  <option value="">Select a clinic...</option>
                  {data.clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-700">
                Receptionist / manager name
                <input name="name" required placeholder="e.g. Crescent Reception" className={inputClass} />
              </label>
              <label className="block text-xs font-medium text-slate-700">
                Login email
                <input name="email" type="email" required placeholder="reception.crescent@example.com" className={inputClass} />
              </label>
              <label className="block text-xs font-medium text-slate-700">
                Phone (optional)
                <input name="phone" placeholder="01700-000011" className={inputClass} />
              </label>
              <label className="block text-xs font-medium text-slate-700">
                Initial password (8+ chars)
                <input name="password" type="password" required minLength={8} className={inputClass} />
              </label>
              <button
                type="submit"
                disabled={createAdminPending}
                className="w-full rounded-lg bg-teal-700 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
              >
                {createAdminPending ? "Creating..." : "Create clinic login"}
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-8">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Clinic admin accounts</h2>
              <p className="text-xs text-slate-500">Reset passwords or disable access for clinic staff.</p>
            </div>
            <div className="p-4">
              <ActionFeedback state={resetPwState} />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-left text-sm">
                <thead className="border-y border-slate-200 bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Account</th>
                    <th className="px-4 py-2.5 font-semibold">Linked Clinic</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.clinicAdmins.map((admin) => (
                    <tr key={admin.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{admin.name}</p>
                        <p className="text-xs text-slate-500">{admin.email}</p>
                        {resetUserId === admin.id && (
                          <form action={resetPwFormAction} className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg border border-teal-200 bg-teal-50/40 p-2.5">
                            <input type="hidden" name="userId" value={admin.id} />
                            <input
                              name="newPassword"
                              type="password"
                              required
                              minLength={8}
                              placeholder="New password (8+ chars)"
                              className="min-w-[180px] flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                            />
                            <button
                              type="submit"
                              disabled={resetPwPending}
                              className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setResetUserId(null)}
                              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700"
                            >
                              Close
                            </button>
                          </form>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {admin.clinic?.name ?? <span className="text-slate-400">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusTag active={admin.isActive} activeLabel="Active" inactiveLabel="Disabled" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setResetUserId(resetUserId === admin.id ? null : admin.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <KeyRound className="h-3 w-3" aria-hidden="true" />
                            Reset password
                          </button>
                          <form action={toggleUserActiveAction}>
                            <input type="hidden" name="userId" value={admin.id} />
                            <input type="hidden" name="nextActive" value={admin.isActive ? "false" : "true"} />
                            <button
                              type="submit"
                              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                                admin.isActive
                                  ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                  : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {admin.isActive ? "Disable" : "Enable"}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: DOCTORS, PHOTO UPLOAD & CSV IMPORT */}
      {tab === "doctors" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Add Doctor + Upload Photo */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-6">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Upload className="h-4 w-4 text-teal-700" aria-hidden="true" />
                Add doctor &amp; upload photo
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Only Super Admins can add doctors and upload or update doctor portraits.
              </p>

              <form onSubmit={handleCreateDoctorSubmit} className="mt-4 space-y-3">
                <ActionFeedback state={createDoctorState} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Doctor name
                    <input name="name" required placeholder="Dr. Ayesha Siddiqua" className={inputClass} />
                  </label>
                  <label className="block text-xs font-medium text-slate-700">
                    Qualifications
                    <input name="qualifications" placeholder="MBBS, FCPS" className={inputClass} />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Clinic
                    <select name="clinicId" required className={inputClass}>
                      <option value="">Select clinic...</option>
                      {data.clinics.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-slate-700">
                    Specialty
                    <select name="specialtyId" required className={inputClass}>
                      <option value="">Select specialty...</option>
                      {data.specialties.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Consultation fee (BDT)
                    <input name="consultationFee" type="number" min={0} required defaultValue={1000} className={inputClass} />
                  </label>
                  <label className="block text-xs font-medium text-slate-700">
                    Minutes per patient
                    <input name="avgConsultMinutes" type="number" min={5} max={120} defaultValue={15} className={inputClass} />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Chamber start
                    <input name="startTime" defaultValue="16:00" className={inputClass} />
                  </label>
                  <label className="block text-xs font-medium text-slate-700">
                    Chamber end
                    <input name="endTime" defaultValue="20:00" className={inputClass} />
                  </label>
                </div>

                <div>
                  <span className="block text-xs font-medium text-slate-700">Chamber weekdays</span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => (
                      <label key={day.value} className="inline-flex items-center gap-1.5 rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-700">
                        <input type="checkbox" name="weekdays" value={day.value} defaultChecked={day.value <= 4} className="accent-teal-700" />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex items-center gap-3">
                    <DoctorAvatar name="Dr" photoUrl={createPhotoPreview} size="sm" />
                    <label className="block flex-1 text-xs font-medium text-slate-700">
                      Doctor portrait (PNG/JPG/WebP/GIF, max 5 MB)
                      <input
                        name="photo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (createPhotoPreview) URL.revokeObjectURL(createPhotoPreview);
                          setCreatePhotoPreview(file ? URL.createObjectURL(file) : null);
                        }}
                        className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-teal-800 hover:file:bg-teal-100"
                      />
                    </label>
                  </div>
                  <label className="mt-2.5 block text-xs font-medium text-slate-700">
                    Or paste image URL (optional)
                    <input name="photoUrl" type="url" placeholder="https://example.com/doctor.jpg" className={inputClass} />
                  </label>
                </div>

                <label className="block text-xs font-medium text-slate-700">
                  Bio (optional)
                  <textarea name="bio" rows={2} placeholder="Brief overview of focus areas..." className={inputClass} />
                </label>

                <button
                  type="submit"
                  disabled={createDoctorPending}
                  className="w-full rounded-lg bg-teal-700 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
                >
                  {createDoctorPending ? "Saving doctor..." : "Add doctor"}
                </button>
              </form>
            </section>

            {/* CSV Bulk Import */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <FileSpreadsheet className="h-4 w-4 text-teal-700" aria-hidden="true" />
                    Bulk CSV import
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Upload or paste a CSV to add multiple doctors for existing clinics at once.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCsvDraft(sampleCsv)}
                  className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                >
                  Fill sample CSV
                </button>
              </div>

              <form action={csvFormAction} className="mt-4 space-y-3">
                <ActionFeedback state={csvState} />
                <label className="block text-xs font-medium text-slate-700">
                  Upload .csv file
                  <input
                    name="csvFile"
                    type="file"
                    accept=".csv,text/csv"
                    className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-teal-800 hover:file:bg-teal-100"
                  />
                </label>

                <label className="block text-xs font-medium text-slate-700">
                  Or paste CSV rows
                  <textarea
                    name="csvText"
                    rows={7}
                    value={csvDraft}
                    onChange={(e) => setCsvDraft(e.target.value)}
                    placeholder="name,clinicName,specialty,qualifications,consultationFee,avgConsultMinutes,bio"
                    className={`${inputClass} font-mono text-xs`}
                  />
                </label>

                <p className="text-xs text-slate-500">
                  Required columns: <code className="font-mono">name, clinicName, specialty, consultationFee</code>.
                </p>

                <button
                  type="submit"
                  disabled={csvPending}
                  className="w-full rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-60"
                >
                  {csvPending ? "Importing..." : "Import doctors from CSV"}
                </button>
              </form>
            </section>
          </div>

          {/* Doctors Table with Photo & Info Editor */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">All doctors</h2>
              <p className="text-xs text-slate-500">Click Edit to update doctor details or upload/replace their photo.</p>
            </div>
            <div className="p-4">
              <ActionFeedback state={updateDoctorState} />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-left text-sm">
                <thead className="border-y border-slate-200 bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Doctor</th>
                    <th className="px-4 py-2.5 font-semibold">Clinic &amp; Specialty</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Fee</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.doctors.map((doc) => (
                    <tr key={doc.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <DoctorAvatar name={doc.name} photoUrl={doc.photoUrl} size="sm" />
                          <div>
                            <p className="font-semibold text-slate-900">{doc.name}</p>
                            {doc.qualifications && <p className="text-xs text-slate-500">{doc.qualifications}</p>}
                          </div>
                        </div>

                        {editingDoctorId === doc.id && (
                          <form onSubmit={(e) => handleUpdateDoctorSubmit(e, doc.id)} className="mt-3 space-y-2.5 rounded-lg border border-teal-200 bg-teal-50/40 p-3.5">
                            <ActionFeedback state={updateDoctorState} />
                            <div className="grid gap-2 sm:grid-cols-2">
                              <input name="name" defaultValue={doc.name} required className={inputClass} aria-label="Doctor name" />
                              <input name="qualifications" defaultValue={doc.qualifications ?? ""} placeholder="Qualifications" className={inputClass} aria-label="Qualifications" />
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <select name="clinicId" defaultValue={doc.clinicId} className={inputClass} aria-label="Clinic">
                                {data.clinics.map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                              <select name="specialtyId" defaultValue={doc.specialtyId} className={inputClass} aria-label="Specialty">
                                {data.specialties.map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <input name="consultationFee" type="number" min={0} defaultValue={doc.consultationFee} required className={inputClass} aria-label="Fee" />
                              <input name="avgConsultMinutes" type="number" min={5} max={120} defaultValue={doc.avgConsultMinutes} required className={inputClass} aria-label="Minutes" />
                              <select name="isActive" defaultValue={doc.isActive ? "true" : "false"} className={inputClass} aria-label="Status">
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                              </select>
                            </div>
                            <textarea name="bio" rows={2} defaultValue={doc.bio ?? ""} placeholder="Bio" className={inputClass} aria-label="Bio" />
                            <div className="space-y-2 rounded-md border border-teal-100 bg-white p-2.5">
                              <div className="flex flex-wrap items-center gap-3">
                                <DoctorAvatar name={doc.name} photoUrl={editPhotoPreview ?? doc.photoUrl} size="sm" />
                                <label className="text-xs font-medium text-slate-700">
                                  Upload new photo (max 5 MB):
                                  <input
                                    name="photo"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (editPhotoPreview) URL.revokeObjectURL(editPhotoPreview);
                                      setEditPhotoPreview(file ? URL.createObjectURL(file) : null);
                                    }}
                                    className="mt-1 block text-xs text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-teal-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-teal-800"
                                  />
                                </label>
                                {doc.photoUrl && (
                                  <label className="inline-flex items-center gap-1.5 text-xs text-rose-700">
                                    <input type="checkbox" name="removePhoto" className="accent-rose-600" />
                                    Remove current photo
                                  </label>
                                )}
                              </div>
                              <label className="block text-xs font-medium text-slate-700">
                                Or paste image URL (optional)
                                <input name="photoUrl" type="url" placeholder="https://example.com/doctor.jpg" className={inputClass} />
                              </label>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={updateDoctorPending}
                                className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                              >
                                {updateDoctorPending ? "Saving..." : "Save changes"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (editPhotoPreview) {
                                    URL.revokeObjectURL(editPhotoPreview);
                                    setEditPhotoPreview(null);
                                  }
                                  setEditingDoctorId(null);
                                }}
                                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                              >
                                Close
                              </button>
                            </div>
                          </form>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{doc.clinic.name}</p>
                        <p className="text-xs text-slate-500">{doc.specialty.name}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800 tabular-nums">
                        {formatFee(doc.consultationFee)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusTag active={doc.isActive} activeLabel="Active" inactiveLabel="Inactive" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (editPhotoPreview) {
                              URL.revokeObjectURL(editPhotoPreview);
                              setEditPhotoPreview(null);
                            }
                            setUpdateDoctorState({});
                            setEditingDoctorId(editingDoctorId === doc.id ? null : doc.id);
                          }}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Edit &amp; photo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: USERS SEARCH & SUSPEND */}
      {tab === "users" && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">All users</h2>
              <p className="text-xs text-slate-500">Search accounts by name, email, role, or clinic and suspend/reactivate access.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users..."
                aria-label="Search users"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">User</th>
                  <th className="px-4 py-2.5 font-semibold">Role</th>
                  <th className="px-4 py-2.5 font-semibold">Clinic</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                      No users match &ldquo;{userSearch}&rdquo;.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.id === data.currentUserId;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{u.name}</p>
                          <p className="text-xs text-slate-500">
                            {u.email}
                            {u.phone ? ` · ${u.phone}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">{u.role}</td>
                        <td className="px-4 py-3 text-slate-600">{u.clinic?.name ?? "-"}</td>
                        <td className="px-4 py-3">
                          <StatusTag active={u.isActive} activeLabel="Active" inactiveLabel="Suspended" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isSelf ? (
                            <span className="text-xs text-slate-400">Current account</span>
                          ) : (
                            <form action={toggleUserActiveAction} className="inline">
                              <input type="hidden" name="userId" value={u.id} />
                              <input type="hidden" name="nextActive" value={u.isActive ? "false" : "true"} />
                              <button
                                type="submit"
                                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                                  u.isActive
                                    ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                    : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                }`}
                              >
                                {u.isActive ? (
                                  <>
                                    <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                                    Suspend
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-3 w-3" aria-hidden="true" />
                                    Reactivate
                                  </>
                                )}
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 5: ACTIVITY LOG (AuditLog) */}
      {tab === "audit" && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">Activity log</h2>
            <p className="text-xs text-slate-500">Administrative actions recorded in the AuditLog table.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Timestamp</th>
                  <th className="px-4 py-2.5 font-semibold">Actor</th>
                  <th className="px-4 py-2.5 font-semibold">Action</th>
                  <th className="px-4 py-2.5 font-semibold">Entity</th>
                  <th className="px-4 py-2.5 font-semibold">Target ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                      No administrative actions logged yet. Create or update a clinic, staff account, or doctor to record entries.
                    </td>
                  </tr>
                ) : (
                  data.auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}
                      </td>
                      <td className="px-4 py-2.5 text-slate-800">
                        {log.user ? `${log.user.name} (${log.user.email})` : "System"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-teal-800">{log.action}</td>
                      <td className="px-4 py-2.5 text-slate-700">{log.entity}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{log.entityId ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
