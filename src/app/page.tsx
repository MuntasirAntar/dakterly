import Link from "next/link";
import { db } from "@/lib/db";
import { getFilterOptions } from "@/lib/doctors";
import SearchForm from "@/components/SearchForm";

const steps = [
  { title: "Find your doctor", text: "Search by name, specialty, clinic or city, and compare fees and schedules." },
  { title: "Book a time slot", text: "Pick an open slot and get a token number. No more turning up and hoping." },
  { title: "Track your queue", text: "See your position and estimated wait live, and leave home only when your turn is near." },
];

export default async function Home() {
  const [{ specialties, cities }, clinics] = await Promise.all([
    getFilterOptions(),
    db.clinic.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { doctors: true } } },
    }),
  ]);

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-600 px-4 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Find a doctor. Skip the waiting room.</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-teal-50">
            Book an appointment and follow your place in the queue live, from home.
          </p>
          <div className="mt-8 text-left">
            <SearchForm cities={cities} />
          </div>
          <p className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-teal-50">
            <span>Popular:</span>
            {specialties.slice(0, 5).map((name) => (
              <Link
                key={name}
                href={`/doctors?specialty=${encodeURIComponent(name)}`}
                className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/25"
              >
                {name}
              </Link>
            ))}
          </p>
        </div>
      </section>

      {/* Specialties */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900">Browse by specialty</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {specialties.map((name) => (
            <Link
              key={name}
              href={`/doctors?specialty=${encodeURIComponent(name)}`}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:border-teal-600 hover:text-teal-700"
            >
              {name}
            </Link>
          ))}
        </div>
        <p className="mt-5 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">
          Not sure who to see? Our symptom assistant is coming soon and will suggest the right specialist for you.
        </p>
      </section>

      {/* How it works */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-bold text-gray-900">How Dakterly works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-gray-200 p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clinics */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900">Clinics on Dakterly</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {clinics.map((clinic) => (
            <Link
              key={clinic.id}
              href={`/clinics/${clinic.id}`}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md"
            >
              <h3 className="font-semibold text-gray-900">{clinic.name}</h3>
              <p className="mt-1 text-sm text-gray-600">
                {clinic.address}, {clinic.city}
              </p>
              <p className="mt-3 text-sm font-medium text-teal-700">
                {clinic._count.doctors} {clinic._count.doctors === 1 ? "doctor" : "doctors"}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
