"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register } from "@/app/actions/auth";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{messages[0]}</p>;
}

const inputClass = "mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900";

export default function RegisterForm({ next }: { next?: string | null }) {
  const [state, formAction, pending] = useActionState(register, undefined);
  const errors = state?.fieldErrors;

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
      <input type="hidden" name="next" value={next ?? ""} />
      <h1 className="text-2xl font-bold text-teal-700">Create your account</h1>

      {state?.error && (
        <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm font-medium">
        Full name
        <input name="name" required autoComplete="name" defaultValue={state?.values?.name} className={inputClass} />
        <FieldError messages={errors?.name} />
      </label>

      <label className="block text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="email" defaultValue={state?.values?.email} className={inputClass} />
        <FieldError messages={errors?.email} />
      </label>

      <label className="block text-sm font-medium">
        Phone (optional)
        <input name="phone" type="tel" autoComplete="tel" defaultValue={state?.values?.phone} className={inputClass} />
        <FieldError messages={errors?.phone} />
      </label>

      <label className="block text-sm font-medium">
        Password
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
        <FieldError messages={errors?.password} />
      </label>

      <div>
        <label className="flex items-start gap-2 text-sm">
          <input name="consent" type="checkbox" className="mt-1" />
          <span>I agree to the privacy policy and understand my health-related data is handled carefully.</span>
        </label>
        <FieldError messages={errors?.consent} />
      </div>

      <button type="submit" disabled={pending} className="w-full rounded bg-teal-700 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60">
        {pending ? "Creating account..." : "Sign up"}
      </button>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-teal-700 underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
