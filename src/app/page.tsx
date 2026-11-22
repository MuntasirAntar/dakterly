import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { getFilterOptions } from "@/lib/doctors";
import HeroSlideshow from "@/components/HeroSlideshow";
import ClinicsSlideshow, { type ClinicSlideItem } from "@/components/ClinicsSlideshow";

export const revalidate = 60;

const steps = [
  {
    number: "01",
    title: "Find your doctor",
    text: "Search by name, specialty, clinic, or city, and compare consultation fees and weekly schedules.",
  },
  {
    number: "02",
    title: "Book a time slot",
    text: "Pick an open time slot and receive your token number immediately—no turning up and waiting blindly.",
  },
  {
    number: "03",
    title: "Track your queue live",
    text: "Follow your exact token position and estimated wait from home, and head to the clinic when your turn is near.",
  },
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

  const clinicSlides: ClinicSlideItem[] = clinics.map((c) => ({
    id: c.id,
    name: c.name,
    address: c.address,
    city: c.city,
    phone: c.phone,
    openTime: c.openTime,
    closeTime: c.closeTime,
    doctorCount: c._count.doctors,
  }));

  return (
    <main className="flex-1">
      {/* Hero with green gradient scrim over medical & doctor slideshow */}
      <HeroSlideshow cities={cities} popularSpecialties={specialties.slice(0, 5)} />

      {/* Browse by specialty */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Browse by specialty
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 sm:text-base">
              Choose a medical department to see available doctors and consultation times.
            </p>
          </div>
          <Link
            href="/doctors"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 transition-colors duration-200 hover:text-emerald-600 whitespace-nowrap"
          >
            <span>View all doctors</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {specialties.map((name) => (
            <Link
              key={name}
              href={`/doctors?specialty=${encodeURIComponent(name)}`}
              className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 transition-all duration-200 hover:border-teal-600 hover:bg-teal-50/70 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <span className="truncate">{name}</span>
              <ArrowRight
                className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-teal-700"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* How Dakterly works */}
      <section className="border-y border-slate-200/80 bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              How Dakterly works
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 sm:text-base">
              Three straightforward steps from choosing a specialist to stepping into the consultation room.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition-colors duration-200 hover:border-teal-200 hover:bg-teal-50/30"
              >
                <span className="font-mono text-sm font-semibold text-teal-700 tabular-nums">
                  {step.number}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clinics on Dakterly slideshow */}
      <ClinicsSlideshow clinics={clinicSlides} />
    </main>
  );
}
