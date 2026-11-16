"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Mail, Send } from "lucide-react";

const PARTNER_EMAIL = "antar2390@gmail.com";

type FormValues = {
  clinicName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  doctorCount: string;
  message: string;
};

const INITIAL: FormValues = {
  clinicName: "",
  contactName: "",
  email: "",
  phone: "",
  city: "",
  doctorCount: "1-5 doctors",
  message: "",
};

function buildMailtoHref(v: FormValues) {
  const subject = v.clinicName
    ? `Clinic Partnership Inquiry: ${v.clinicName} (${v.city || "Bangladesh"})`
    : "Clinic Partnership Inquiry — Dakterly";
  const lines = [
    "Hello Dakterly Partnerships Team,",
    "",
    "We would like to join Dakterly as a partner clinic.",
    "",
    `Clinic Name: ${v.clinicName || "-"}`,
    `Contact Person: ${v.contactName || "-"}`,
    `Reply Email: ${v.email || "-"}`,
    `Phone: ${v.phone || "-"}`,
    `City: ${v.city || "-"}`,
    `Number of Doctors: ${v.doctorCount || "-"}`,
    "",
    `Notes: ${v.message || "-"}`,
  ];
  return `mailto:${PARTNER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}

export default function PartnerClinicForm() {
  const [values, setValues] = useState<FormValues>(INITIAL);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submittedEmailSent, setSubmittedEmailSent] = useState<boolean>(false);
  const [submittedSnapshot, setSubmittedSnapshot] = useState<FormValues | null>(null);

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const res = await fetch("/api/clinic-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send inquiry. Please try again.");
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }
      setSubmittedRef(data.referenceId);
      setSubmittedEmailSent(Boolean(data.emailSent));
      setSubmittedSnapshot(values);
      setValues(INITIAL);
    } catch {
      setError("Network error while sending inquiry. You can also email us directly below.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedRef && submittedSnapshot) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">Inquiry received</h3>
            <p className="mt-1 text-sm text-slate-700">
              Thank you, <span className="font-semibold">{submittedSnapshot.contactName}</span>. Your partnership request for{" "}
              <span className="font-semibold">{submittedSnapshot.clinicName}</span> has been sent to our Super Admin team under reference{" "}
              <span className="font-mono font-semibold text-teal-800">{submittedRef}</span>.
              {submittedEmailSent && (
                <span> An email notification has also been delivered to {PARTNER_EMAIL}.</span>
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={buildMailtoHref(submittedSnapshot)}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-600"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Also open in your email app
          </a>
          <button
            type="button"
            onClick={() => {
              setSubmittedRef(null);
              setSubmittedSnapshot(null);
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Submit another inquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Clinic or hospital name
          <input
            required
            value={values.clinicName}
            onChange={(e) => setValues({ ...values, clinicName: e.target.value })}
            placeholder="e.g. Crescent Diagnostic Center"
            className={inputClass}
          />
          {fieldErrors.clinicName?.[0] && <span className="mt-1 block text-xs text-red-600">{fieldErrors.clinicName[0]}</span>}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Contact person
          <input
            required
            value={values.contactName}
            onChange={(e) => setValues({ ...values, contactName: e.target.value })}
            placeholder="Dr. / Coordinator name"
            className={inputClass}
          />
          {fieldErrors.contactName?.[0] && <span className="mt-1 block text-xs text-red-600">{fieldErrors.contactName[0]}</span>}
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Official email
          <input
            type="email"
            required
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            placeholder="admin@yourclinic.com"
            className={inputClass}
          />
          {fieldErrors.email?.[0] && <span className="mt-1 block text-xs text-red-600">{fieldErrors.email[0]}</span>}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Phone number
          <input
            type="tel"
            required
            value={values.phone}
            onChange={(e) => setValues({ ...values, phone: e.target.value })}
            placeholder="01700-000000"
            className={inputClass}
          />
          {fieldErrors.phone?.[0] && <span className="mt-1 block text-xs text-red-600">{fieldErrors.phone[0]}</span>}
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          City
          <input
            required
            value={values.city}
            onChange={(e) => setValues({ ...values, city: e.target.value })}
            placeholder="Dhaka, Chattogram, Sylhet..."
            className={inputClass}
          />
          {fieldErrors.city?.[0] && <span className="mt-1 block text-xs text-red-600">{fieldErrors.city[0]}</span>}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Active doctors
          <select
            value={values.doctorCount}
            onChange={(e) => setValues({ ...values, doctorCount: e.target.value })}
            className={inputClass}
          >
            <option value="1-5 doctors">1–5 doctors</option>
            <option value="6-15 doctors">6–15 doctors</option>
            <option value="16-30 doctors">16–30 doctors</option>
            <option value="30+ doctors">30+ doctors</option>
          </select>
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Specialties &amp; notes (optional)
        <textarea
          rows={3}
          value={values.message}
          onChange={(e) => setValues({ ...values, message: e.target.value })}
          placeholder="Tell us your clinic hours, departments, or preferred onboarding date."
          className={inputClass}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-md disabled:opacity-60"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {submitting ? "Sending request..." : "Send partnership request"}
        </button>

        <a
          href={buildMailtoHref(values)}
          className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50/70 px-4 py-2.5 text-sm font-medium text-teal-800 transition-all duration-200 hover:border-teal-600 hover:bg-teal-100/70"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          Compose in email app
        </a>
      </div>
    </form>
  );
}
