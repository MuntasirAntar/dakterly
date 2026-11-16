"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import GoogleAuthButton from "@/components/GoogleAuthButton";

export default function LoginForm({ next }: { next?: string | null }) {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="w-full max-w-md space-y-4 rounded-2xl border border-white/40 bg-white/95 p-7 text-slate-900 shadow-2xl backdrop-blur-md">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-teal-800">Log in</h2>
        <p className="mt-1 text-sm text-slate-600">Enter your account email and password.</p>
      </div>

      <GoogleAuthButton mode="login" next={next} />

      <div className="relative flex items-center py-1">
        <div className="flex-grow border-t border-slate-200" />
        <span className="mx-3 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">or with email</span>
        <div className="flex-grow border-t border-slate-200" />
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />

        {state?.error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={state?.values?.email}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-teal-700 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-md disabled:opacity-60"
        >
          {pending ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-600">
        New here?{" "}
        <Link
          href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
          className="font-medium text-teal-700 underline hover:text-emerald-600"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
