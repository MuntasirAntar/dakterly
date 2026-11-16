"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/components/FirebaseProvider";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import { friendlyFirebaseAuthError, signInWithEmailPassword } from "@/lib/firebase-client";

export default function LoginForm({ next }: { next?: string | null }) {
  const router = useRouter();
  const { ready, profile } = useFirebase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !profile || !profile.isActive) return;
    if (next) {
      router.replace(next);
      return;
    }
    if (profile.role === "SUPER_ADMIN") router.replace("/superadmin");
    else if (profile.role === "CLINIC_ADMIN") router.replace("/admin");
    else router.replace("/");
  }, [ready, profile, next, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const { idToken } = await signInWithEmailPassword(email, password);
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, next: next ?? undefined }),
      });
      const data = (await res.json()) as { ok?: boolean; redirectTo?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      window.location.assign(data.redirectTo ?? "/");
    } catch (err: unknown) {
      setError(friendlyFirebaseAuthError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-4 rounded-2xl border border-white/40 bg-white/95 p-7 text-slate-900 shadow-2xl backdrop-blur-md">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-teal-800">Log in</h2>
        <p className="mt-1 text-sm text-slate-600">
          Use Google for instant sign-in (patients, invited clinic staff &amp; admins), or email/password if enabled.
        </p>
      </div>

      <GoogleAuthButton mode="login" next={next} />

      <div className="relative flex items-center py-1">
        <div className="flex-grow border-t border-slate-200" />
        <span className="mx-3 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">or with email</span>
        <div className="flex-grow border-t border-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">
            {error}
          </p>
        )}

        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-teal-700 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-md disabled:opacity-60"
        >
          {pending ? "Logging in..." : "Log in with email"}
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
