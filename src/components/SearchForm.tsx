"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type Props = {
  cities: string[];
  defaults?: { q?: string; city?: string; specialty?: string };
  onSearch?: (filters: { q?: string; city?: string; specialty?: string }) => void;
};

// Uses Next.js client-side navigation (or instant in-page filtering when onSearch is passed)
// so searching never triggers a slow full browser reload, while preserving GET form fallback.
export default function SearchForm({ cities, defaults, onSearch }: Props) {
  const router = useRouter();
  const incomingKey = `${defaults?.q ?? ""}|${defaults?.city ?? ""}`;
  const [prevKey, setPrevKey] = useState(incomingKey);
  const [q, setQ] = useState(defaults?.q ?? "");
  const [city, setCity] = useState(defaults?.city ?? "");

  if (incomingKey !== prevKey) {
    setPrevKey(incomingKey);
    setQ(defaults?.q ?? "");
    setCity(defaults?.city ?? "");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQ = q.trim() || undefined;
    const selectedCity = city || undefined;

    if (onSearch) {
      onSearch({
        q: trimmedQ,
        city: selectedCity,
        specialty: defaults?.specialty,
      });
      return;
    }

    const params = new URLSearchParams();
    if (trimmedQ) params.set("q", trimmedQ);
    if (selectedCity) params.set("city", selectedCity);
    if (defaults?.specialty) params.set("specialty", defaults.specialty);
    const query = params.toString();
    router.push(query ? `/doctors?${query}` : "/doctors");
  }

  return (
    <form
      action="/doctors"
      method="get"
      role="search"
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-lg sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3">
        <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <input
          name="q"
          type="search"
          value={q}
          onChange={(e) => {
            const nextVal = e.target.value;
            setQ(nextVal);
            if (onSearch) {
              onSearch({
                q: nextVal.trim() || undefined,
                city: city || undefined,
                specialty: defaults?.specialty,
              });
            }
          }}
          maxLength={80}
          aria-label="Search doctors, specialties or clinics"
          placeholder="Search a doctor, specialty or clinic"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
      <select
        name="city"
        value={city}
        onChange={(e) => {
          const nextCity = e.target.value;
          setCity(nextCity);
          if (onSearch) {
            onSearch({
              q: q.trim() || undefined,
              city: nextCity || undefined,
              specialty: defaults?.specialty,
            });
          }
        }}
        aria-label="City"
        className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 sm:w-44"
      >
        <option value="">All cities</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {defaults?.specialty && <input type="hidden" name="specialty" value={defaults.specialty} />}
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white whitespace-nowrap transition-all duration-200 hover:bg-emerald-600 hover:shadow-md hover:shadow-teal-700/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
      >
        Search
      </button>
    </form>
  );
}
