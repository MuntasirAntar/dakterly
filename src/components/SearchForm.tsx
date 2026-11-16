import { Search } from "lucide-react";

type Props = {
  cities: string[];
  defaults?: { q?: string; city?: string; specialty?: string };
};

// A plain HTML form: submitting it opens /doctors?q=...&city=...
// No JavaScript needed, so it works even before the page has finished loading.
export default function SearchForm({ cities, defaults }: Props) {
  return (
    <form
      action="/doctors"
      method="get"
      role="search"
      className="flex flex-col gap-2 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-lg sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3">
        <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <input
          name="q"
          type="search"
          defaultValue={defaults?.q}
          maxLength={80}
          aria-label="Search doctors, specialties or clinics"
          placeholder="Search a doctor, specialty or clinic"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
      <select
        name="city"
        defaultValue={defaults?.city ?? ""}
        aria-label="City"
        className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 sm:w-44"
      >
        <option value="">All cities</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
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
