"use client";

import Link from "next/link";

type Props = {
  specialties: string[];
  active?: string;
  q?: string;
  city?: string;
  onSelect?: (specialty?: string) => void;
};

// Clickable specialty filters. Each chip keeps the other filters (q, city)
// and supports instant in-browser filtering when onSelect is provided.
export default function SpecialtyChips({ specialties, active, q, city, onSelect }: Props) {
  function hrefFor(specialty?: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (city) params.set("city", city);
    if (specialty) params.set("specialty", specialty);
    const query = params.toString();
    return query ? `/doctors?${query}` : "/doctors";
  }

  const chip = (isActive: boolean) =>
    `shrink-0 rounded-lg border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-200 sm:text-sm ${
      isActive
        ? "border-teal-700 bg-teal-700 text-white shadow-sm"
        : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-teal-600 hover:bg-teal-50 hover:text-teal-800"
    }`;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
      <Link
        href={hrefFor()}
        onClick={(e) => {
          if (onSelect && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            onSelect(undefined);
          }
        }}
        className={chip(!active)}
      >
        All specialties
      </Link>
      {specialties.map((name) => (
        <Link
          key={name}
          href={hrefFor(name)}
          onClick={(e) => {
            if (onSelect && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
              e.preventDefault();
              onSelect(name);
            }
          }}
          className={chip(active === name)}
        >
          {name}
        </Link>
      ))}
    </div>
  );
}
