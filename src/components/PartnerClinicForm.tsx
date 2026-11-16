"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Mail, Send } from "lucide-react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useFirebase } from "@/components/FirebaseProvider";
import { OperationType, clampString, firestore, handleFirestoreError, optionalString } from "@/lib/firebase";
import { friendlyFirebaseAuthError, signInWithGoogle } from "@/lib/firebase-client";

const PARTNER_EMAIL = "partnerships@dakterly.com";

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
  const { firebaseUser } = useFirebase();
  const [values, setValues] = useState<FormValues>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submittedSnapshot, setSubmittedSnapshot] = useState<FormValues | null>(null);

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      let currentUser = firebaseUser;
      if (!currentUser) {
        try {
          const authRes = await signInWithGoogle();
          currentUser = authRes.user;
        } catch (err) {
          setError(friendlyFirebaseAuthError(err));
          return;
        }
      }

      const referenceId = `DK-CL-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const inquiryId = `${referenceId}_${currentUser.uid.slice(0, 8)}`;

      try {
        await setDoc(doc(firestore, "clinicInquiries", inquiryId), {
          submittedByUid: currentUser.uid,
          clinicName: clampString(values.clinicName, 120, 2),
          contactName: clampString(values.contactName, 80, 2),
          email: clampString(values.email.toLowerCase(), 160, 3),
          phone: clampString(values.phone, 30, 6),
          city: clampString(values.city, 60, 2),
          doctorCount: optionalString(values.doctorCount, 30),
          message: optionalString(values.message, 1000),
          referenceId,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `clinicInquiries/${inquiryId}`);
      }

      setSubmittedRef(referenceId);
      setSubmittedSnapshot(values);
      setValues(INITIAL);
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
            <h3 className="text-lg font-bold text-slate-900">Inquiry saved to Dakterly</h3>
            <p className="mt-1 text-sm text-slate-700">
              Thank you, <span className="font-semibold">{submittedSnapshot.contactName}</span>. Your partnership request for{" "}
              <span className="font-semibold">{submittedSnapshot.clinicName}</span> has been recorded under reference{" "}
              <span className="font-mono font-semibold text-teal-800">{submittedRef}</span>.
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
            minLength={2}
            maxLength={120}
            value={values.clinicName}
            onChange={(e) => setValues({ ...values, clinicName: e.target.value })}
            placeholder="e.g. Crescent Diagnostic Center"
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Contact person
          <input
            required
            minLength={2}
            maxLength={80}
            value={values.contactName}
            onChange={(e) => setValues({ ...values, contactName: e.target.value })}
            placeholder="Dr. / Coordinator name"
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Official email
          <input
            type="email"
            required
            maxLength={160}
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            placeholder="admin@yourclinic.com"
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Phone number
          <input
            type="tel"
            required
            minLength={6}
            maxLength={30}
            value={values.phone}
            onChange={(e) => setValues({ ...values, phone: e.target.value })}
            placeholder="01700-000000"
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          City
          <input
            required
            minLength={2}
            maxLength={60}
            value={values.city}
            onChange={(e) => setValues({ ...values, city: e.target.value })}
            placeholder="Dhaka, Chattogram, Sylhet..."
            className={inputClass}
          />
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
          maxLength={1000}
          value={values.message}
          onChange={(e) => setValues({ ...values, message: e.target.value })}
          placeholder="Tell us your clinic hours, departments, or preferred onboarding date."
          className={inputClass}
        />
      </label>

      {!firebaseUser && (
        <p className="text-xs text-slate-500">
          Clicking submit will verify your identity with Google before saving to Firestore, or email us directly below.
        </p>
      )}

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
