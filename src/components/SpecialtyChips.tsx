import Link from "next/link";

type Props = { specialties: string[]; active?: string; q?: string; city?: string };

// Clickable specialty filters. Each link keeps the other filters (q, city).
export default function SpecialtyChips({ specialties, active, q, city }: Props) {
  function hrefFor(specialty?: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (city) params.set("city", city);
    if (specialty) params.set("specialty", specialty);
    const query = params.toString();
    return query ? `/doctors?${query}` : "/doctors";
  }

  const chip = (isActive: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
      isActive
        ? "border-teal-700 bg-teal-700 text-white"
        : "border-gray-300 bg-white text-gray-700 hover:border-teal-600 hover:text-teal-700"
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={hrefFor()} className={chip(!active)}>
        All specialties
      </Link>
      {specialties.map((name) => (
        <Link key={name} href={hrefFor(name)} className={chip(active === name)}>
          {name}
        </Link>
      ))}
    </div>
  );
}
