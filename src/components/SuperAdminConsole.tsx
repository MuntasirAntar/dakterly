"use client";

import {
  type FormEvent,
  useActionState,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  Trash2,
  Upload,
  UserCheck,
  UserCog,
  Users,
  UserX,
  X,
} from "lucide-react";
import {
  approvePartnershipDirectAction,
  createClinicAction,
  createClinicAdminAction,
  deleteClinicAction,
  deleteDoctorAction,
  handleDoctorRemovalRequestAction,
  importDoctorsCsvAction,
  resetUserPasswordAction,
  toggleClinicActiveAction,
  toggleUserActiveAction,
  updateClinicAction,
  updatePartnershipStatusDirectAction,
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
    newPartnershipRequests: number;
    pendingRemovalRequests: number;
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
  clinicInquiries: Array<{
    id: string;
    referenceId: string;
    clinicName: string;
    contactName: string;
    email: string;
    phone: string;
    city: string;
    doctorCount: string | null;
    message: string | null;
    status: string;
    emailSent: boolean;
    createdAt: string;
  }>;
  doctorRemovalRequests: Array<{
    id: string;
    doctorId: string;
    doctorName: string;
    specialty: string;
    clinicId: string;
    clinicName: string;
    requestedBy: string;
    reason: string | null;
    status: string;
    createdAt: string;
  }>;
};

type TabId = "clinics" | "admins" | "doctors" | "users" | "partnerships" | "removals" | "audit";

type ClinicItem = SuperAdminData["clinics"][number];
type DoctorItem = SuperAdminData["doctors"][number];
type InquiryItem = SuperAdminData["clinicInquiries"][number];
type RemovalItem = SuperAdminData["doctorRemovalRequests"][number];
type AdminItem = SuperAdminData["clinicAdmins"][number];
type UserItem = SuperAdminData["users"][number];

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

function StatusTag({
  active,
  activeLabel = "Active",
  inactiveLabel = "Disabled",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
        active
          ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border border-rose-200 bg-rose-50 text-rose-800"
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

export default function SuperAdminConsole({ data }: { data: SuperAdminData }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<TabId>("clinics");
  const [editingClinicId, setEditingClinicId] = useState<string | null>(null);
  const [confirmDeleteClinicId, setConfirmDeleteClinicId] = useState<string | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [confirmDeleteDoctorId, setConfirmDeleteDoctorId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [csvDraft, setCsvDraft] = useState("");
  const [inquiryAddresses, setInquiryAddresses] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<AdminActionState | null>(null);

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

  // Optimistic state collections for instant zero-delay UI feedback
  const [optInquiries, dispatchInquiries] = useOptimistic(
    data.clinicInquiries,
    (state: InquiryItem[], action: { type: "status"; id: string; status: string }) =>
      state.map((item) => (item.id === action.id ? { ...item, status: action.status } : item)),
  );

  const [optClinics, dispatchClinics] = useOptimistic(
    data.clinics,
    (
      state: ClinicItem[],
      action:
        | { type: "add"; clinic: ClinicItem }
        | { type: "remove"; id: string }
        | { type: "toggle"; id: string; nextActive: boolean },
    ) => {
      if (action.type === "add") {
        if (state.some((c) => c.id === action.clinic.id)) return state;
        return [...state, action.clinic].sort((a, b) => a.name.localeCompare(b.name));
      }
      if (action.type === "remove") {
        return state.filter((c) => c.id !== action.id);
      }
      return state.map((c) => (c.id === action.id ? { ...c, isActive: action.nextActive } : c));
    },
  );

  const [optDoctors, dispatchDoctors] = useOptimistic(
    data.doctors,
    (state: DoctorItem[], action: { type: "remove"; id: string } | { type: "removeByClinic"; clinicId: string }) => {
      if (action.type === "removeByClinic") {
        return state.filter((d) => d.clinicId !== action.clinicId);
      }
      return state.filter((d) => d.id !== action.id);
    },
  );

  const [optRemovals, dispatchRemovals] = useOptimistic(
    data.doctorRemovalRequests,
    (
      state: RemovalItem[],
      action:
        | { type: "status"; id: string; status: string }
        | { type: "approveByDoctor"; doctorId: string }
        | { type: "dismissByClinic"; clinicId: string },
    ) => {
      if (action.type === "approveByDoctor") {
        return state.map((r) =>
          r.doctorId === action.doctorId && r.status === "PENDING" ? { ...r, status: "APPROVED" } : r,
        );
      }
      if (action.type === "dismissByClinic") {
        return state.map((r) =>
          r.clinicId === action.clinicId && r.status === "PENDING" ? { ...r, status: "DISMISSED" } : r,
        );
      }
      return state.map((r) => (r.id === action.id ? { ...r, status: action.status } : r));
    },
  );

  const [optAdmins, dispatchAdmins] = useOptimistic(
    data.clinicAdmins,
    (state: AdminItem[], action: { type: "toggle"; id: string; nextActive: boolean }) =>
      state.map((a) => (a.id === action.id ? { ...a, isActive: action.nextActive } : a)),
  );

  const [optUsers, dispatchUsers] = useOptimistic(
    data.users,
    (state: UserItem[], action: { type: "toggle"; id: string; nextActive: boolean }) =>
      state.map((u) => (u.id === action.id ? { ...u, isActive: action.nextActive } : u)),
  );

  function handlePartnershipStatus(inquiryId: string, status: "REVIEWED" | "DISMISSED") {
    setBanner(null);
    startTransition(async () => {
      dispatchInquiries({ type: "status", id: inquiryId, status });
      const res = await updatePartnershipStatusDirectAction(inquiryId, status);
      setBanner(res);
      router.refresh();
    });
  }

  function handlePartnershipApprove(inq: InquiryItem) {
    setBanner(null);
    const addressInput = inquiryAddresses[inq.id]?.trim() || inq.city;
    startTransition(async () => {
      dispatchInquiries({ type: "status", id: inq.id, status: "APPROVED" });
      dispatchClinics({
        type: "add",
        clinic: {
          id: `temp-${inq.id}`,
          name: inq.clinicName,
          address: addressInput,
          city: inq.city,
          phone: inq.phone || null,
          openTime: "09:00",
          closeTime: "21:00",
          isActive: true,
          _count: { doctors: 0, staff: 0 },
        },
      });
      const res = await approvePartnershipDirectAction(inq.id, addressInput);
      setBanner({ ok: res.ok, message: res.message, error: res.error });
      router.refresh();
    });
  }

  function handleToggleClinic(clinic: ClinicItem) {
    const nextActive = !clinic.isActive;
    setBanner(null);
    startTransition(async () => {
      dispatchClinics({ type: "toggle", id: clinic.id, nextActive });
      const fd = new FormData();
      fd.set("clinicId", clinic.id);
      fd.set("nextActive", nextActive ? "true" : "false");
      await toggleClinicActiveAction(fd);
      router.refresh();
    });
  }

  function handleDeleteClinic(clinic: ClinicItem) {
    setConfirmDeleteClinicId(null);
    setEditingClinicId(null);
    setBanner(null);
    startTransition(async () => {
      dispatchClinics({ type: "remove", id: clinic.id });
      dispatchDoctors({ type: "removeByClinic", clinicId: clinic.id });
      dispatchRemovals({ type: "dismissByClinic", clinicId: clinic.id });
      const res = await deleteClinicAction(clinic.id);
      setBanner(res);
      router.refresh();
    });
  }

  function handleDeleteDoctor(doc: DoctorItem) {
    setConfirmDeleteDoctorId(null);
    setEditingDoctorId(null);
    setBanner(null);
    startTransition(async () => {
      dispatchDoctors({ type: "remove", id: doc.id });
      dispatchRemovals({ type: "approveByDoctor", doctorId: doc.id });
      const res = await deleteDoctorAction(doc.id);
      setBanner(res);
      router.refresh();
    });
  }

  function handleDoctorRemovalDecision(req: RemovalItem, decision: "APPROVE" | "DISMISS") {
    setBanner(null);
    startTransition(async () => {
      dispatchRemovals({
        type: "status",
        id: req.id,
        status: decision === "APPROVE" ? "APPROVED" : "DISMISSED",
      });
      if (decision === "APPROVE") {
        dispatchDoctors({ type: "remove", id: req.doctorId });
      }
      const res = await handleDoctorRemovalRequestAction(req.id, decision);
      setBanner(res);
      router.refresh();
    });
  }

  function handleToggleUser(userId: string, currentActive: boolean) {
    const nextActive = !currentActive;
    setBanner(null);
    startTransition(async () => {
      dispatchAdmins({ type: "toggle", id: userId, nextActive });
      dispatchUsers({ type: "toggle", id: userId, nextActive });
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("nextActive", nextActive ? "true" : "false");
      await toggleUserActiveAction(fd);
      router.refresh();
    });
  }

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
    if (!q) return optUsers;
    return optUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.clinic?.name.toLowerCase().includes(q) ?? false),
    );
  }, [optUsers, userSearch]);

  const newCount = optInquiries.filter((q) => q.status === "NEW").length;
  const pendingRemovalsCount = optRemovals.filter((r) => r.status === "PENDING").length;

  const tabs: Array<{ id: TabId; label: string; count?: number; highlightCount?: number; icon: typeof Building2 }> = [
    { id: "clinics", label: "Clinics", count: optClinics.length, icon: Building2 },
    { id: "admins", label: "Clinic Admins", count: optAdmins.length, icon: UserCog },
    { id: "doctors", label: "Doctors", count: optDoctors.length, icon: Stethoscope },
    { id: "users", label: "Users", count: optUsers.length, icon: Users },
    { id: "partnerships", label: "Partnership Requests", count: newCount, highlightCount: newCount, icon: Bell },
    { id: "removals", label: "Removal Requests", count: pendingRemovalsCount, highlightCount: pendingRemovalsCount, icon: UserX },
    { id: "audit", label: "Activity Log", count: data.auditLogs.length, icon: Activity },
  ];

  const sampleCsv = [
    "name,clinicName,specialty,qualifications,consultationFee,avgConsultMinutes,bio",
    `Dr. Nadia Islam,${optClinics[0]?.name ?? "Green Crescent Medical Center"},Cardiologist,"MBBS, MD",1400,15,Senior heart specialist focused on preventive care.`,
    `Dr. Tariq Hasan,${optClinics[0]?.name ?? "Green Crescent Medical Center"},Dermatologist,"MBBS, DDV",1000,10,Clinical dermatologist for adult and pediatric skin care.`,
  ].join("\n");

  const stats = [
    { label: "Clinics", value: optClinics.length, sub: `${optClinics.filter((c) => c.isActive).length} active` },
    { label: "Doctors", value: optDoctors.length, sub: `${optDoctors.filter((d) => d.isActive).length} active` },
    { label: "Patients", value: data.counts.patients, sub: "Registered accounts" },
    { label: "Today's Appointments", value: data.counts.todayAppointments, sub: data.today },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Notification Action Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-emerald-200/80 bg-white px-4 py-3.5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-2.5 text-sm text-slate-700 sm:items-center">
          <span
            className={`mt-1.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full sm:mt-0 ${
              newCount > 0 || pendingRemovalsCount > 0 ? "animate-pulse bg-emerald-500" : "bg-slate-300"
            }`}
            aria-hidden="true"
          />
          <span className="font-medium leading-snug">
            {newCount > 0 || pendingRemovalsCount > 0 ? (
              <>
                {newCount > 0 && `${newCount} partnership ${newCount === 1 ? "request" : "requests"}`}
                {newCount > 0 && pendingRemovalsCount > 0 && " · "}
                {pendingRemovalsCount > 0 && `${pendingRemovalsCount} doctor removal ${pendingRemovalsCount === 1 ? "request" : "requests"}`}
                {" awaiting review"}
              </>
            ) : (
              "Platform inbox is up to date"
            )}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
            title="Refresh dashboard"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setTab("partnerships")}
            className={`inline-flex min-h-[38px] items-center justify-center gap-2.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
              newCount > 0
                ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                : "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            <Bell className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Partnership Request</span>
            <span
              className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 font-mono text-xs font-bold tabular-nums ${
                newCount > 0 ? "bg-white text-emerald-700" : "bg-emerald-600 text-white"
              }`}
            >
              {newCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("removals")}
            className={`inline-flex min-h-[38px] items-center justify-center gap-2.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 ${
              pendingRemovalsCount > 0
                ? "bg-amber-600 text-white shadow-sm hover:bg-amber-700"
                : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <UserX className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Doctor Removal</span>
            <span
              className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 font-mono text-xs font-bold tabular-nums ${
                pendingRemovalsCount > 0 ? "bg-white text-amber-700" : "bg-slate-200 text-slate-700"
              }`}
            >
              {pendingRemovalsCount}
            </span>
          </button>
        </div>
      </div>

      {/* Instant feedback banner for optimistic actions */}
      {banner && (banner.message || banner.error) && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <ActionFeedback state={banner} />
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            aria-label="Dismiss notification"
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

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
      <div
        className="flex gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm md:flex-wrap"
        role="tablist"
      >
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
              className={`inline-flex min-h-[38px] shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-all duration-150 sm:text-sm ${
                active
                  ? "bg-teal-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-teal-50 hover:text-teal-900"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span
                  className={`font-mono text-xs tabular-nums ${
                    active
                      ? "text-emerald-200"
                      : item.highlightCount && item.highlightCount > 0
                        ? "rounded-full bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800"
                        : "text-slate-400"
                  }`}
                >
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
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-4">
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                className="min-h-[40px] w-full rounded-lg bg-teal-700 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
              >
                {createClinicPending ? "Creating..." : "Create clinic"}
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-8">
            <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
              <h2 className="text-base font-bold text-slate-900">All clinics</h2>
              <p className="text-xs text-slate-500">Edit clinic details, toggle availability, or permanently remove a clinic.</p>
            </div>
            {(updateClinicState.error || updateClinicState.message) && (
              <div className="p-4 pb-0">
                <ActionFeedback state={updateClinicState} />
              </div>
            )}

            {/* Mobile & Portrait Tablet Card View */}
            <div className="divide-y divide-slate-100 md:hidden">
              {optClinics.map((clinic) => (
                <div key={clinic.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{clinic.name}</p>
                      <p className="text-xs text-slate-500">{clinic.address}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {clinic.city} · <span className="font-mono">{clinic.openTime}–{clinic.closeTime}</span> ·{" "}
                        <span className="font-mono">{clinic._count.doctors}</span> doctors
                      </p>
                      {clinic.phone && <p className="font-mono text-xs text-slate-500">{clinic.phone}</p>}
                    </div>
                    <StatusTag active={clinic.isActive} activeLabel="Active" inactiveLabel="Deactivated" />
                  </div>

                  {editingClinicId === clinic.id && (
                    <form action={updateClinicFormAction} className="space-y-2 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
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
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={updateClinicPending}
                          className="min-h-[36px] rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingClinicId(null)}
                          className="min-h-[36px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                        >
                          Close
                        </button>
                      </div>
                    </form>
                  )}

                  {confirmDeleteClinicId === clinic.id ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                      <p className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" aria-hidden="true" />
                        Remove {clinic.name} and its {clinic._count.doctors} doctors?
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteClinic(clinic)}
                          className="min-h-[36px] rounded-md bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-700"
                        >
                          Confirm remove
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteClinicId(null)}
                          className="min-h-[36px] rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteClinicId(null);
                          setEditingClinicId(editingClinicId === clinic.id ? null : clinic.id);
                        }}
                        className="min-h-[36px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleClinic(clinic)}
                        className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium ${
                          clinic.isActive
                            ? "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                            : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {clinic.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteClinicId(clinic.id)}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop & Landscape iPad Table View */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
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
                  {optClinics.map((clinic) => (
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
                        {confirmDeleteClinicId === clinic.id ? (
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5">
                            <span className="text-xs font-medium text-rose-800">Delete clinic &amp; doctors?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteClinic(clinic)}
                              className="rounded bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteClinicId(null)}
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteClinicId(null);
                                setEditingClinicId(editingClinicId === clinic.id ? null : clinic.id);
                              }}
                              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleClinic(clinic)}
                              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                                clinic.isActive
                                  ? "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                  : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {clinic.isActive ? "Deactivate" : "Reactivate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteClinicId(clinic.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                              title={`Remove ${clinic.name}`}
                            >
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
                              Remove
                            </button>
                          </div>
                        )}
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
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-4">
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
                  {optClinics.map((c) => (
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
                className="min-h-[40px] w-full rounded-lg bg-teal-700 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
              >
                {createAdminPending ? "Creating..." : "Create clinic login"}
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-8">
            <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
              <h2 className="text-base font-bold text-slate-900">Clinic admin accounts</h2>
              <p className="text-xs text-slate-500">Reset passwords or disable access for clinic staff.</p>
            </div>
            {(resetPwState.error || resetPwState.message) && (
              <div className="p-4 pb-0">
                <ActionFeedback state={resetPwState} />
              </div>
            )}

            {/* Mobile Card View */}
            <div className="divide-y divide-slate-100 md:hidden">
              {optAdmins.map((admin) => (
                <div key={admin.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{admin.name}</p>
                      <p className="truncate text-xs text-slate-500">{admin.email}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {admin.clinic?.name ?? <span className="text-slate-400">Unassigned</span>}
                      </p>
                    </div>
                    <StatusTag active={admin.isActive} activeLabel="Active" inactiveLabel="Disabled" />
                  </div>

                  {resetUserId === admin.id && (
                    <form action={resetPwFormAction} className="flex flex-wrap items-center gap-2 rounded-lg border border-teal-200 bg-teal-50/40 p-2.5">
                      <input type="hidden" name="userId" value={admin.id} />
                      <input
                        name="newPassword"
                        type="password"
                        required
                        minLength={8}
                        placeholder="New password (8+ chars)"
                        className="min-w-[160px] flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs"
                      />
                      <button
                        type="submit"
                        disabled={resetPwPending}
                        className="min-h-[36px] rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setResetUserId(null)}
                        className="min-h-[36px] rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700"
                      >
                        Close
                      </button>
                    </form>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setResetUserId(resetUserId === admin.id ? null : admin.id)}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                      Reset password
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleUser(admin.id, admin.isActive)}
                      className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium ${
                        admin.isActive
                          ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                          : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {admin.isActive ? "Disable" : "Enable"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-y border-slate-200 bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Account</th>
                    <th className="px-4 py-2.5 font-semibold">Linked Clinic</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {optAdmins.map((admin) => (
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
                          <button
                            type="button"
                            onClick={() => handleToggleUser(admin.id, admin.isActive)}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                              admin.isActive
                                ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {admin.isActive ? "Disable" : "Enable"}
                          </button>
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

      {/* TAB 3: DOCTORS, PHOTO UPLOAD, CSV IMPORT & REMOVAL */}
      {tab === "doctors" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Add Doctor + Upload Photo */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-6">
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
                      {optClinics.map((c) => (
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

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-medium text-slate-700">
                    Fee (BDT)
                    <input name="consultationFee" type="number" min={0} required defaultValue={1000} className={inputClass} />
                  </label>
                  <label className="block text-xs font-medium text-slate-700">
                    Mins / patient
                    <input name="avgConsultMinutes" type="number" min={5} max={120} defaultValue={15} className={inputClass} />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                  className="min-h-[40px] w-full rounded-lg bg-teal-700 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
                >
                  {createDoctorPending ? "Saving doctor..." : "Add doctor"}
                </button>
              </form>
            </section>

            {/* CSV Bulk Import */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-6">
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
                  className="min-h-[40px] w-full rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-60"
                >
                  {csvPending ? "Importing..." : "Import doctors from CSV"}
                </button>
              </form>
            </section>
          </div>

          {/* Doctors Table / Mobile Cards */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
              <h2 className="text-base font-bold text-slate-900">All doctors</h2>
              <p className="text-xs text-slate-500">Edit details, replace photos, or permanently remove a doctor from the platform.</p>
            </div>
            {(updateDoctorState.error || updateDoctorState.message) && (
              <div className="p-4 pb-0">
                <ActionFeedback state={updateDoctorState} />
              </div>
            )}

            {/* Mobile & Portrait Tablet Card View */}
            <div className="divide-y divide-slate-100 md:hidden">
              {optDoctors.map((doc) => (
                <div key={doc.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <DoctorAvatar name={doc.name} photoUrl={doc.photoUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{doc.name}</p>
                        <p className="text-xs text-slate-600">{doc.specialty.name} · {doc.clinic.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-slate-700">{formatFee(doc.consultationFee)}</p>
                      </div>
                    </div>
                    <StatusTag active={doc.isActive} activeLabel="Active" inactiveLabel="Inactive" />
                  </div>

                  {editingDoctorId === doc.id && (
                    <form onSubmit={(e) => handleUpdateDoctorSubmit(e, doc.id)} className="space-y-2.5 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
                      <ActionFeedback state={updateDoctorState} />
                      <input name="name" defaultValue={doc.name} required className={inputClass} aria-label="Doctor name" />
                      <input name="qualifications" defaultValue={doc.qualifications ?? ""} placeholder="Qualifications" className={inputClass} aria-label="Qualifications" />
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <select name="clinicId" defaultValue={doc.clinicId} className={inputClass} aria-label="Clinic">
                          {optClinics.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <select name="specialtyId" defaultValue={doc.specialtyId} className={inputClass} aria-label="Specialty">
                          {data.specialties.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input name="consultationFee" type="number" min={0} defaultValue={doc.consultationFee} className={inputClass} aria-label="Consultation fee" />
                        <input name="avgConsultMinutes" type="number" min={5} max={120} defaultValue={doc.avgConsultMinutes} className={inputClass} aria-label="Minutes per patient" />
                      </div>
                      <select name="isActive" defaultValue={doc.isActive ? "true" : "false"} className={inputClass} aria-label="Status">
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                      <textarea name="bio" rows={2} defaultValue={doc.bio ?? ""} placeholder="Bio" className={inputClass} aria-label="Bio" />
                      <div className="rounded-md border border-slate-200 bg-white p-2.5 space-y-2">
                        <div className="flex items-center gap-3">
                          <DoctorAvatar name={doc.name} photoUrl={editPhotoPreview ?? doc.photoUrl} size="sm" />
                          <input
                            name="photo"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (editPhotoPreview) URL.revokeObjectURL(editPhotoPreview);
                              setEditPhotoPreview(file ? URL.createObjectURL(file) : null);
                            }}
                            className="block w-full text-xs text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-teal-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-teal-800"
                          />
                        </div>
                        {doc.photoUrl && (
                          <label className="inline-flex items-center gap-1.5 text-xs text-rose-700">
                            <input type="checkbox" name="removePhoto" className="accent-rose-600" />
                            Remove current photo
                          </label>
                        )}
                        <input name="photoUrl" type="url" placeholder="Or paste image URL (optional)" className={inputClass} />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={updateDoctorPending}
                          className="min-h-[36px] rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
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
                          className="min-h-[36px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                        >
                          Close
                        </button>
                      </div>
                    </form>
                  )}

                  {confirmDeleteDoctorId === doc.id ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                      <p className="font-semibold">Remove {doc.name} permanently?</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteDoctor(doc)}
                          className="min-h-[36px] rounded-md bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-700"
                        >
                          Confirm remove
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteDoctorId(null)}
                          className="min-h-[36px] rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteDoctorId(null);
                          if (editPhotoPreview) {
                            URL.revokeObjectURL(editPhotoPreview);
                            setEditPhotoPreview(null);
                          }
                          setUpdateDoctorState({});
                          setEditingDoctorId(editingDoctorId === doc.id ? null : doc.id);
                        }}
                        className="min-h-[36px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit &amp; photo
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteDoctorId(doc.id)}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop & Landscape iPad Table View */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
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
                  {optDoctors.map((doc) => (
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
                                {optClinics.map((c) => (
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
                              <input name="consultationFee" type="number" min={0} defaultValue={doc.consultationFee} className={inputClass} aria-label="Consultation fee" />
                              <input name="avgConsultMinutes" type="number" min={5} max={120} defaultValue={doc.avgConsultMinutes} className={inputClass} aria-label="Minutes per patient" />
                              <select name="isActive" defaultValue={doc.isActive ? "true" : "false"} className={inputClass} aria-label="Status">
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                              </select>
                            </div>
                            <textarea name="bio" rows={2} defaultValue={doc.bio ?? ""} placeholder="Bio" className={inputClass} aria-label="Bio" />
                            <div className="rounded-md border border-slate-200 bg-white p-2.5 space-y-2">
                              <div className="flex flex-wrap items-center gap-3">
                                <DoctorAvatar name={doc.name} photoUrl={editPhotoPreview ?? doc.photoUrl} size="sm" />
                                <label className="block flex-1 text-xs font-medium text-slate-700">
                                  Replace photo
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
                        {confirmDeleteDoctorId === doc.id ? (
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5">
                            <span className="text-xs font-medium text-rose-800">Remove doctor?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteDoctor(doc)}
                              className="rounded bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteDoctorId(null)}
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteDoctorId(null);
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
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteDoctorId(doc.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                            >
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
                              Remove
                            </button>
                          </div>
                        )}
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
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

          {/* Mobile Card View */}
          <div className="divide-y divide-slate-100 md:hidden">
            {filteredUsers.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                No users match &ldquo;{userSearch}&rdquo;.
              </p>
            ) : (
              filteredUsers.map((u) => {
                const isSelf = u.id === data.currentUserId;
                return (
                  <div key={u.id} className="space-y-2.5 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{u.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {u.email}
                          {u.phone ? ` · ${u.phone}` : ""}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-slate-600">
                          {u.role}
                          {u.clinic?.name ? ` · ${u.clinic.name}` : ""}
                        </p>
                      </div>
                      <StatusTag active={u.isActive} activeLabel="Active" inactiveLabel="Suspended" />
                    </div>
                    <div>
                      {isSelf ? (
                        <span className="text-xs text-slate-400">Current account</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleUser(u.id, u.isActive)}
                          className={`inline-flex min-h-[36px] items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium ${
                            u.isActive
                              ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                              : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                              Suspend
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                              Reactivate
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
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
                            <button
                              type="button"
                              onClick={() => handleToggleUser(u.id, u.isActive)}
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

      {/* TAB 5: PARTNERSHIP REQUESTS */}
      {tab === "partnerships" && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Bell className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                Clinic Partnership Requests
              </h2>
              <p className="text-xs text-slate-500">
                Submissions from the Join Dakterly for Clinics form. Approve to add the clinic immediately or dismiss.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              {newCount} unread
            </span>
          </div>

          {optInquiries.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-800">No partnership requests yet</p>
              <p className="mt-1 text-xs text-slate-500">
                When a clinic submits the partnership form on /join-clinic, all details will appear here immediately.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {optInquiries.map((inq) => {
                const statusBadgeClass =
                  inq.status === "NEW"
                    ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                    : inq.status === "APPROVED"
                      ? "border-teal-200 bg-teal-50 text-teal-800"
                      : inq.status === "DISMISSED"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-slate-100 text-slate-700";

                return (
                  <article
                    key={inq.id}
                    className={`p-4 transition-colors sm:p-5 ${inq.status === "NEW" ? "bg-emerald-50/35" : "bg-white"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{inq.clinicName}</h3>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass}`}>
                            {inq.status}
                          </span>
                          <span className="font-mono text-xs text-slate-500">{inq.referenceId}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Submitted {new Date(inq.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}
                          {inq.emailSent && " · Email sent to website inbox"}
                        </p>
                      </div>

                      <a
                        href={`mailto:${inq.email}?subject=${encodeURIComponent(`Re: Dakterly Partnership Request (${inq.clinicName})`)}`}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Mail className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                        Reply via email
                      </a>
                    </div>

                    <dl className="mt-4 grid gap-3 rounded-lg border border-slate-200/80 bg-white p-3.5 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-xs text-slate-500">Contact person</dt>
                        <dd className="mt-0.5 font-medium text-slate-900">{inq.contactName}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Official email</dt>
                        <dd className="mt-0.5 break-all font-medium text-teal-800">{inq.email}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Phone</dt>
                        <dd className="mt-0.5 flex items-center gap-1 font-mono text-xs text-slate-800">
                          <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                          {inq.phone}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">City &amp; doctors</dt>
                        <dd className="mt-0.5 flex items-center gap-1 text-slate-800">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                          <span>
                            {inq.city}
                            {inq.doctorCount ? ` · ${inq.doctorCount}` : ""}
                          </span>
                        </dd>
                      </div>
                    </dl>

                    {inq.message && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-700">
                        <span className="block text-xs font-semibold text-slate-500">Specialties &amp; notes</span>
                        <p className="mt-0.5 whitespace-pre-wrap">{inq.message}</p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                      {inq.status !== "APPROVED" && (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="text"
                            value={inquiryAddresses[inq.id] ?? ""}
                            onChange={(e) =>
                              setInquiryAddresses((prev) => ({ ...prev, [inq.id]: e.target.value }))
                            }
                            placeholder={`Street address (default: ${inq.city})`}
                            aria-label="Clinic street address"
                            className="min-h-[38px] w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600 sm:w-56"
                          />
                          <button
                            type="button"
                            onClick={() => handlePartnershipApprove(inq)}
                            className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Approve &amp; Add Clinic
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        {inq.status === "NEW" && (
                          <button
                            type="button"
                            onClick={() => handlePartnershipStatus(inq.id, "REVIEWED")}
                            className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Mark Reviewed
                          </button>
                        )}

                        {inq.status !== "DISMISSED" && inq.status !== "APPROVED" && (
                          <button
                            type="button"
                            onClick={() => handlePartnershipStatus(inq.id, "DISMISSED")}
                            className="min-h-[38px] rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 6: DOCTOR REMOVAL REQUESTS */}
      {tab === "removals" && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <UserX className="h-4 w-4 text-amber-600" aria-hidden="true" />
                Doctor Removal Requests
              </h2>
              <p className="text-xs text-slate-500">
                Requests sent by clinic administrators. Approving removes the doctor from the platform immediately.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              {pendingRemovalsCount} pending
            </span>
          </div>

          {optRemovals.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-800">No doctor removal requests</p>
              <p className="mt-1 text-xs text-slate-500">
                When a clinic admin requests doctor removal from their dashboard, it will show up here for your approval.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {optRemovals.map((req) => {
                const badgeClass =
                  req.status === "PENDING"
                    ? "border-amber-300 bg-amber-100 text-amber-900"
                    : req.status === "APPROVED"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-slate-100 text-slate-600";

                return (
                  <article
                    key={req.id}
                    className={`p-4 transition-colors sm:p-5 ${req.status === "PENDING" ? "bg-amber-50/35" : "bg-white"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{req.doctorName}</h3>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          {req.specialty} · <strong className="font-medium text-slate-800">{req.clinicName}</strong>
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Requested by {req.requestedBy} ·{" "}
                          {new Date(req.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}
                        </p>
                      </div>

                      {req.status === "PENDING" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDoctorRemovalDecision(req, "APPROVE")}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Approve &amp; Remove Doctor
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDoctorRemovalDecision(req, "DISMISS")}
                            className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>

                    {req.reason && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-700">
                        <span className="block text-xs font-semibold text-slate-500">Reason from clinic admin</span>
                        <p className="mt-0.5 whitespace-pre-wrap">{req.reason}</p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 7: ACTIVITY LOG (AuditLog) */}
      {tab === "audit" && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
            <h2 className="text-base font-bold text-slate-900">Activity log</h2>
            <p className="text-xs text-slate-500">Administrative actions recorded in the AuditLog table.</p>
          </div>

          {/* Mobile Card View */}
          <div className="divide-y divide-slate-100 md:hidden">
            {data.auditLogs.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                No administrative actions logged yet.
              </p>
            ) : (
              data.auditLogs.map((log) => (
                <div key={log.id} className="space-y-1 p-4 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-teal-800">{log.action}</span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {new Date(log.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}
                    </span>
                  </div>
                  <p className="text-slate-800">{log.user ? `${log.user.name} (${log.user.email})` : "System"}</p>
                  <p className="font-mono text-slate-500">
                    {log.entity}
                    {log.entityId ? ` · ${log.entityId}` : ""}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
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
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-600 tabular-nums">
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
