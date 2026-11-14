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
      className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg sm:flex-row sm:items-center"
    >
      <input
        name="q"
        type="search"
        defaultValue={defaults?.q}
        maxLength={80}
        aria-label="Search doctors, specialties or clinics"
        placeholder="Search a doctor, specialty or clinic"
        className="min-w-0 flex-1 rounded-xl px-4 py-3 text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-teal-600"
      />
      <select
        name="city"
        defaultValue={defaults?.city ?? ""}
        aria-label="City"
        className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-teal-600 sm:w-44"
      >
        <option value="">All cities</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
      {defaults?.specialty && <input type="hidden" name="specialty" value={defaults.specialty} />}
      <button type="submit" className="rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white hover:bg-teal-800">
        Search
      </button>
    </form>
  );
}
