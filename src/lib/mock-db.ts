import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

type AnyRow = Record<string, unknown>;

interface Store {
  User: AnyRow[];
  Clinic: AnyRow[];
  Specialty: AnyRow[];
  Doctor: AnyRow[];
  DoctorSchedule: AnyRow[];
  Appointment: AnyRow[];
  Reminder: AnyRow[];
  AuditLog: AnyRow[];
  ClinicInquiry: AnyRow[];
  DoctorRemovalRequest: AnyRow[];
}

function toDate(val: unknown): Date | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val;
  if (typeof val === "number" || typeof val === "string") return new Date(val);
  return null;
}

function toBool(val: unknown): boolean {
  return val === true || val === 1;
}

function loadInitialStore(): Store {
  const empty: Store = {
    User: [],
    Clinic: [],
    Specialty: [],
    Doctor: [],
    DoctorSchedule: [],
    Appointment: [],
    Reminder: [],
    AuditLog: [],
    ClinicInquiry: [],
    DoctorRemovalRequest: [],
  };

  try {
    const filePath = path.join(process.cwd(), "sqlite-export.json");
    if (!fs.existsSync(filePath)) return empty;
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Partial<Store>;

    const superEnvPw = process.env.SUPERADMIN_PASSWORD || "SuperAdmin@12345";
    const users = (raw.User ?? []).map((u) => {
      const base: AnyRow = {
        ...u,
        isActive: toBool(u.isActive),
        mustChangePassword: toBool(u.mustChangePassword),
        createdAt: toDate(u.createdAt) ?? new Date(),
      };
      if (base.role === "SUPER_ADMIN" && base.email === "superadmin@example.com") {
        base.passwordHash = bcrypt.hashSync(superEnvPw, 10);
      }
      return base;
    });

    return {
      User: users,
      Clinic: (raw.Clinic ?? []).map((c) => ({
        ...c,
        isActive: toBool(c.isActive),
        createdAt: toDate(c.createdAt) ?? new Date(),
      })),
      Specialty: (raw.Specialty ?? []).map((s) => ({ ...s })),
      Doctor: (raw.Doctor ?? []).map((d) => ({
        ...d,
        photoUrl: typeof d.photoUrl === "string" ? d.photoUrl : null,
        isActive: toBool(d.isActive),
        createdAt: toDate(d.createdAt) ?? new Date(),
      })),
      DoctorSchedule: (raw.DoctorSchedule ?? []).map((s) => ({ ...s })),
      Appointment: (raw.Appointment ?? []).map((a) => ({
        ...a,
        checkedInAt: toDate(a.checkedInAt),
        startedAt: toDate(a.startedAt),
        completedAt: toDate(a.completedAt),
        cancelledAt: toDate(a.cancelledAt),
        createdAt: toDate(a.createdAt) ?? new Date(),
      })),
      Reminder: (raw.Reminder ?? []).map((r) => ({ ...r })),
      AuditLog: (raw.AuditLog ?? []).map((l) => ({
        ...l,
        createdAt: toDate(l.createdAt) ?? new Date(),
      })),
      ClinicInquiry: (raw.ClinicInquiry ?? []).map((q) => ({
        ...q,
        emailSent: toBool(q.emailSent),
        createdAt: toDate(q.createdAt) ?? new Date(),
      })),
      DoctorRemovalRequest: (raw.DoctorRemovalRequest ?? []).map((r) => ({
        ...r,
        createdAt: toDate(r.createdAt) ?? new Date(),
      })),
    };
  } catch (err) {
    console.warn("[AI Studio] Could not load sqlite-export.json for mock DB:", err);
    return empty;
  }
}

let counter = 1;
function cuid() {
  counter += 1;
  return `mock_${Date.now().toString(36)}_${counter.toString(36)}`;
}

function matchesCondition(val: unknown, cond: unknown): boolean {
  if (cond === undefined) return true;
  if (cond === null || typeof cond !== "object" || cond instanceof Date) {
    if (val instanceof Date && cond instanceof Date) return val.getTime() === cond.getTime();
    return val === cond;
  }

  const obj = cond as AnyRow;
  if ("not" in obj) {
    const target = obj.not;
    if (target === null) return val !== null && val !== undefined;
    return val !== target;
  }
  if ("contains" in obj) {
    const needle = String(obj.contains ?? "").toLowerCase();
    return typeof val === "string" && val.toLowerCase().includes(needle);
  }
  if ("equals" in obj) {
    return val === obj.equals;
  }
  if ("gte" in obj && (typeof val === "string" || typeof val === "number" || val instanceof Date)) {
    if (!(val >= (obj.gte as string | number | Date))) return false;
  }
  if ("lte" in obj && (typeof val === "string" || typeof val === "number" || val instanceof Date)) {
    if (!(val <= (obj.lte as string | number | Date))) return false;
  }
  if ("gt" in obj && (typeof val === "string" || typeof val === "number" || val instanceof Date)) {
    if (!(val > (obj.gt as string | number | Date))) return false;
  }
  if ("lt" in obj && (typeof val === "string" || typeof val === "number" || val instanceof Date)) {
    if (!(val < (obj.lt as string | number | Date))) return false;
  }
  if ("in" in obj && Array.isArray(obj.in)) {
    if (!obj.in.includes(val)) return false;
  }
  if ("gte" in obj || "lte" in obj || "gt" in obj || "lt" in obj || "in" in obj) {
    return true;
  }
  return false;
}

export function createMockPrismaClient(): PrismaClient {
  console.warn("[AI Studio] DATABASE_URL not configured — using in-memory mock database seeded from sqlite-export.json");
  const store = loadInitialStore();

  function matchesWhere(model: keyof Store, row: AnyRow, where?: AnyRow): boolean {
    if (!where) return true;
    for (const [key, cond] of Object.entries(where)) {
      if (cond === undefined) continue;
      if (key === "AND" && Array.isArray(cond)) {
        if (!cond.every((sub) => matchesWhere(model, row, sub as AnyRow))) return false;
        continue;
      }
      if (key === "OR" && Array.isArray(cond)) {
        if (!cond.some((sub) => matchesWhere(model, row, sub as AnyRow))) return false;
        continue;
      }
      if (key === "NOT" && cond && typeof cond === "object") {
        if (matchesWhere(model, row, cond as AnyRow)) return false;
        continue;
      }

      if (model === "Doctor") {
        if (key === "clinic" && cond && typeof cond === "object") {
          const clinic = store.Clinic.find((c) => c.id === row.clinicId);
          if (!clinic || !matchesWhere("Clinic", clinic, cond as AnyRow)) return false;
          continue;
        }
        if (key === "specialty" && cond && typeof cond === "object") {
          const spec = store.Specialty.find((s) => s.id === row.specialtyId);
          if (!spec || !matchesWhere("Specialty", spec, cond as AnyRow)) return false;
          continue;
        }
      }
      if (model === "Specialty" && key === "doctors" && cond && typeof cond === "object") {
        const sub = cond as AnyRow;
        if ("some" in sub) {
          const matching = store.Doctor.some(
            (d) => d.specialtyId === row.id && matchesWhere("Doctor", d, sub.some as AnyRow),
          );
          if (!matching) return false;
          continue;
        }
      }
      if (model === "Appointment") {
        if (key === "doctor" && cond && typeof cond === "object") {
          const doc = store.Doctor.find((d) => d.id === row.doctorId);
          if (!doc || !matchesWhere("Doctor", doc, cond as AnyRow)) return false;
          continue;
        }
        if (key === "patient" && cond && typeof cond === "object") {
          const pat = store.User.find((u) => u.id === row.patientId);
          if (!pat || !matchesWhere("User", pat, cond as AnyRow)) return false;
          continue;
        }
      }

      if (!matchesCondition(row[key], cond)) return false;
    }
    return true;
  }

  function resolveCount(model: keyof Store, row: AnyRow): AnyRow {
    if (model === "Clinic") {
      return {
        doctors: store.Doctor.filter((d) => d.clinicId === row.id).length,
        staff: store.User.filter((u) => u.clinicId === row.id).length,
      };
    }
    if (model === "Specialty") {
      return { doctors: store.Doctor.filter((d) => d.specialtyId === row.id).length };
    }
    if (model === "User") {
      return { appointments: store.Appointment.filter((a) => a.patientId === row.id).length };
    }
    if (model === "Doctor") {
      return { appointments: store.Appointment.filter((a) => a.doctorId === row.id).length };
    }
    return {};
  }

  function applySelectOrInclude(model: keyof Store, row: AnyRow, query?: AnyRow): AnyRow {
    if (!query) return { ...row };
    const result: AnyRow = {};

    if (query.select && typeof query.select === "object") {
      const sel = query.select as AnyRow;
      for (const [k, v] of Object.entries(sel)) {
        if (!v) continue;
        if (k === "_count") {
          result._count = resolveCount(model, row);
        } else {
          result[k] = resolveRelation(model, row, k, v);
        }
      }
      return result;
    }

    Object.assign(result, row);
    if (query.include && typeof query.include === "object") {
      const inc = query.include as AnyRow;
      for (const [k, v] of Object.entries(inc)) {
        if (!v) continue;
        if (k === "_count") {
          result._count = resolveCount(model, row);
        } else {
          result[k] = resolveRelation(model, row, k, v);
        }
      }
    }
    return result;
  }

  function resolveRelation(model: keyof Store, row: AnyRow, field: string, spec: unknown): unknown {
    const q = typeof spec === "object" && spec !== null ? (spec as AnyRow) : undefined;
    if (model === "Doctor") {
      if (field === "specialty") {
        const s = store.Specialty.find((x) => x.id === row.specialtyId);
        return s ? applySelectOrInclude("Specialty", s, q) : null;
      }
      if (field === "clinic") {
        const c = store.Clinic.find((x) => x.id === row.clinicId);
        return c ? applySelectOrInclude("Clinic", c, q) : null;
      }
      if (field === "schedules") {
        let rows = store.DoctorSchedule.filter((s) => s.doctorId === row.id);
        rows = sortRows(rows, q?.orderBy);
        return rows.map((r) => applySelectOrInclude("DoctorSchedule", r, q));
      }
    }
    if (model === "Appointment") {
      if (field === "doctor") {
        const d = store.Doctor.find((x) => x.id === row.doctorId);
        return d ? applySelectOrInclude("Doctor", d, q) : null;
      }
      if (field === "patient") {
        const u = store.User.find((x) => x.id === row.patientId);
        return u ? applySelectOrInclude("User", u, q) : null;
      }
    }
    if (model === "User" && field === "clinic") {
      if (!row.clinicId) return null;
      const c = store.Clinic.find((x) => x.id === row.clinicId);
      return c ? applySelectOrInclude("Clinic", c, q) : null;
    }
    if (model === "AuditLog" && field === "user") {
      if (!row.userId) return null;
      const u = store.User.find((x) => x.id === row.userId);
      return u ? applySelectOrInclude("User", u, q) : null;
    }
    return row[field];
  }

  function sortRows(rows: AnyRow[], orderBy: unknown): AnyRow[] {
    if (!orderBy) return rows;
    const list = Array.isArray(orderBy) ? orderBy : [orderBy];
    return [...rows].sort((a, b) => {
      for (const item of list) {
        if (!item || typeof item !== "object") continue;
        for (const [field, dir] of Object.entries(item as AnyRow)) {
          const av = a[field];
          const bv = b[field];
          if (av === bv) continue;
          const mult = dir === "desc" ? -1 : 1;
          if (av == null) return 1;
          if (bv == null) return -1;
          if (av instanceof Date && bv instanceof Date) return (av.getTime() - bv.getTime()) * mult;
          if (typeof av === "number" && typeof bv === "number") return (av - bv) * mult;
          return String(av).localeCompare(String(bv)) * mult;
        }
      }
      return 0;
    });
  }

  function createDelegate(model: keyof Store) {
    return {
      findMany: async (args: AnyRow = {}) => {
        let rows = store[model].filter((r) => matchesWhere(model, r, args.where as AnyRow));
        rows = sortRows(rows, args.orderBy);
        if (Array.isArray(args.distinct) && args.distinct.length > 0) {
          const seen = new Set<string>();
          rows = rows.filter((r) => {
            const key = (args.distinct as string[]).map((f) => String(r[f])).join("|");
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
        if (typeof args.take === "number") rows = rows.slice(0, args.take);
        return rows.map((r) => applySelectOrInclude(model, r, args));
      },
      findFirst: async (args: AnyRow = {}) => {
        let rows = store[model].filter((r) => matchesWhere(model, r, args.where as AnyRow));
        rows = sortRows(rows, args.orderBy);
        const first = rows[0];
        return first ? applySelectOrInclude(model, first, args) : null;
      },
      findUnique: async (args: AnyRow = {}) => {
        const found = store[model].find((r) => matchesWhere(model, r, args.where as AnyRow));
        return found ? applySelectOrInclude(model, found, args) : null;
      },
      count: async (args: AnyRow = {}) => {
        return store[model].filter((r) => matchesWhere(model, r, args.where as AnyRow)).length;
      },
      aggregate: async (args: AnyRow = {}) => {
        const rows = store[model].filter((r) => matchesWhere(model, r, args.where as AnyRow));
        const res: AnyRow = {};
        if (args._max && typeof args._max === "object") {
          const maxObj: AnyRow = {};
          for (const field of Object.keys(args._max as AnyRow)) {
            const nums = rows.map((r) => r[field]).filter((v): v is number => typeof v === "number");
            maxObj[field] = nums.length > 0 ? Math.max(...nums) : null;
          }
          res._max = maxObj;
        }
        return res;
      },
      create: async (args: AnyRow = {}) => {
        const data = { ...((args.data ?? {}) as AnyRow) };
        if (model === "User" && store.User.some((u) => u.email === data.email)) {
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        }
        if (model === "Specialty" && store.Specialty.some((s) => s.name === data.name)) {
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        }
        if (model === "Appointment") {
          if (data.activeSlotKey && store.Appointment.some((a) => a.activeSlotKey === data.activeSlotKey)) {
            throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
          }
          if (
            store.Appointment.some(
              (a) => a.doctorId === data.doctorId && a.date === data.date && a.tokenNumber === data.tokenNumber,
            )
          ) {
            throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
          }
        }

        const nestedSchedules =
          model === "Doctor" && data.schedules && typeof data.schedules === "object"
            ? ((data.schedules as AnyRow).create as AnyRow[] | undefined)
            : undefined;
        if (model === "Doctor" && "schedules" in data) {
          delete data.schedules;
        }

        const id = cuid();
        const record: AnyRow = {
          id,
          createdAt: new Date(),
          ...(model === "User" ? { isActive: true, mustChangePassword: false, phone: null, clinicId: null } : {}),
          ...(model === "Clinic" ? { openTime: "09:00", closeTime: "21:00", isActive: true, phone: null } : {}),
          ...(model === "Doctor" ? { isActive: true, avgConsultMinutes: 10, qualifications: null, bio: null, photoUrl: null } : {}),
          ...(model === "Appointment"
            ? { status: "BOOKED", checkedInAt: null, startedAt: null, completedAt: null, cancelledAt: null }
            : {}),
          ...(model === "ClinicInquiry"
            ? { status: "NEW", emailSent: false, doctorCount: null, message: null }
            : {}),
          ...(model === "DoctorRemovalRequest"
            ? { status: "PENDING", reason: null }
            : {}),
          ...data,
        };
        store[model].push(record);

        if (nestedSchedules && Array.isArray(nestedSchedules)) {
          for (const sched of nestedSchedules) {
            store.DoctorSchedule.push({
              id: cuid(),
              doctorId: id,
              slotMinutes: 10,
              ...sched,
            });
          }
        }

        return applySelectOrInclude(model, record, args);
      },
      update: async (args: AnyRow = {}) => {
        const idx = store[model].findIndex((r) => matchesWhere(model, r, args.where as AnyRow));
        if (idx === -1) {
          throw Object.assign(new Error("Record not found"), { code: "P2025" });
        }
        const data = (args.data ?? {}) as AnyRow;
        const cleanData: AnyRow = {};
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) cleanData[k] = v;
        }
        Object.assign(store[model][idx], cleanData);
        return applySelectOrInclude(model, store[model][idx], args);
      },
      updateMany: async (args: AnyRow = {}) => {
        const data = (args.data ?? {}) as AnyRow;
        let count = 0;
        for (const row of store[model]) {
          if (matchesWhere(model, row, args.where as AnyRow)) {
            Object.assign(row, data);
            count += 1;
          }
        }
        return { count };
      },
      delete: async (args: AnyRow = {}) => {
        const idx = store[model].findIndex((r) => matchesWhere(model, r, args.where as AnyRow));
        if (idx === -1) {
          throw Object.assign(new Error("Record not found"), { code: "P2025" });
        }
        const [removed] = store[model].splice(idx, 1);
        return applySelectOrInclude(model, removed, args);
      },
      deleteMany: async (args: AnyRow = {}) => {
        const before = store[model].length;
        store[model] = store[model].filter((r) => !matchesWhere(model, r, args.where as AnyRow));
        return { count: before - store[model].length };
      },
    };
  }

  return {
    user: createDelegate("User"),
    clinic: createDelegate("Clinic"),
    specialty: createDelegate("Specialty"),
    doctor: createDelegate("Doctor"),
    doctorSchedule: createDelegate("DoctorSchedule"),
    appointment: createDelegate("Appointment"),
    reminder: createDelegate("Reminder"),
    auditLog: createDelegate("AuditLog"),
    clinicInquiry: createDelegate("ClinicInquiry"),
    doctorRemovalRequest: createDelegate("DoctorRemovalRequest"),
    $disconnect: async () => {},
  } as unknown as PrismaClient;
}
