"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register } from "@/app/actions/auth";
import GoogleAuthButton from "@/components/GoogleAuthButton";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{messages[0]}</p>;
}

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20";

export default function RegisterForm({ next }: { next?: string | null }) {
  const [state, formAction, pending] = useActionState(register, undefined);
  const errors = state?.fieldErrors;

  return (
    <div className="w-full max-w-md space-y-3.5 rounded-2xl border border-white/40 bg-white/95 p-7 text-slate-900 shadow-2xl backdrop-blur-md">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-teal-800">Create your account</h2>
        <p className="mt-1 text-sm text-slate-600">Register as a patient to book appointments.</p>
      </div>

      <GoogleAuthButton mode="signup" next={next} />

      <div className="relative flex items-center py-0.5">
        <div className="flex-grow border-t border-slate-200" />
        <span className="mx-3 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">or with email</span>
        <div className="flex-grow border-t border-slate-200" />
      </div>

      <form action={formAction} className="space-y-3.5">
        <input type="hidden" name="next" value={next ?? ""} />

        {state?.error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <label className="block text-sm font-medium text-slate-700">
          Full name
          <input name="name" required autoComplete="name" defaultValue={state?.values?.name} className={inputClass} />
          <FieldError messages={errors?.name} />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Email
          <input name="email" type="email" required autoComplete="email" defaultValue={state?.values?.email} className={inputClass} />
          <FieldError messages={errors?.email} />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Phone (optional)
          <input name="phone" type="tel" autoComplete="tel" defaultValue={state?.values?.phone} className={inputClass} />
          <FieldError messages={errors?.phone} />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Password
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
          <FieldError messages={errors?.password} />
        </label>

        <div>
          <label className="flex items-start gap-2.5 text-sm text-slate-600">
            <input name="consent" type="checkbox" className="mt-1 accent-teal-700" />
            <span>I agree to the privacy policy and understand my health-related data is handled carefully.</span>
          </label>
          <FieldError messages={errors?.consent} />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-teal-700 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-md disabled:opacity-60"
        >
          {pending ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-teal-700 underline hover:text-emerald-600"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
