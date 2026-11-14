"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
      <h1 className="text-2xl font-bold text-teal-700">Log in</h1>

      {state?.error && (
        <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="email" defaultValue={state?.values?.email} className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900" />
      </label>

      <label className="block text-sm font-medium">
        Password
        <input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900" />
      </label>

      <button type="submit" disabled={pending} className="w-full rounded bg-teal-700 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60">
        {pending ? "Logging in..." : "Log in"}
      </button>

      <p className="text-center text-sm text-gray-600">
        New here?{" "}
        <Link href="/register" className="text-teal-700 underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
