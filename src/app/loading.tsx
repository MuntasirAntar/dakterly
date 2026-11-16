import { Stethoscope } from "lucide-react";

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-6" aria-busy="true" aria-live="polite">
      {/* Centered animated pulse indicator */}
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" aria-hidden="true" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-teal-200 bg-teal-50 text-teal-700 shadow-sm">
            <Stethoscope className="h-6 w-6 animate-pulse" aria-hidden="true" />
          </div>
        </div>
        <p className="mt-4 text-sm font-medium text-teal-800">Loading Dakterly...</p>
      </div>

      {/* Subtle page skeleton */}
      <div className="mt-4 space-y-5">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200/80" />
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-teal-100/80" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-28 animate-pulse rounded bg-slate-200" />
                  <div className="h-5 w-44 animate-pulse rounded bg-slate-200/90" />
                </div>
              </div>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
