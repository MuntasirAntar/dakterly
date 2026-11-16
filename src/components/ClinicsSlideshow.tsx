"use client";

import { useEffect, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight, Clock, MapPin, Phone } from "lucide-react";
import clinicGreenCrescent from "@/assets/images/clinic_green_crescent_1794851618487.jpg";
import clinicRiverside from "@/assets/images/clinic_riverside_care_1794851619036.jpg";
import clinicHarbor from "@/assets/images/clinic_harbor_health_1794851619215.jpg";

export type ClinicSlideItem = {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  openTime: string;
  closeTime: string;
  doctorCount: number;
};

const CLINIC_IMAGES: StaticImageData[] = [
  clinicGreenCrescent,
  clinicRiverside,
  clinicHarbor,
];

function imageForClinic(clinic: ClinicSlideItem, idx: number): StaticImageData {
  const lower = clinic.name.toLowerCase();
  if (lower.includes("green")) return clinicGreenCrescent;
  if (lower.includes("riverside")) return clinicRiverside;
  if (lower.includes("harbor")) return clinicHarbor;
  return CLINIC_IMAGES[idx % CLINIC_IMAGES.length];
}

export default function ClinicsSlideshow({ clinics }: { clinics: ClinicSlideItem[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (paused || clinics.length <= 1) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % clinics.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [paused, clinics.length]);

  if (clinics.length === 0) return null;

  const clinic = clinics[active];
  const img = imageForClinic(clinic, active);
  const prev = () => setActive((i) => (i - 1 + clinics.length) % clinics.length);
  const next = () => setActive((i) => (i + 1) % clinics.length);

  return (
    <section
      aria-label="Clinics on Dakterly"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="mx-auto max-w-6xl px-4 py-14 sm:px-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Clinics on Dakterly
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 sm:text-base">
            Explore partner medical centers across Dhaka and Chattogram, or{" "}
            <Link href="/join-clinic" className="font-semibold text-teal-700 underline decoration-teal-700/40 underline-offset-4 hover:text-emerald-600">
              join Dakterly as a clinic
            </Link>
            .
          </p>
        </div>

        {clinics.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="mr-2 font-mono text-xs text-slate-500 tabular-nums">
              0{active + 1} / 0{clinics.length}
            </span>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous clinic"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:border-teal-600 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next clinic"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:border-teal-600 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid items-stretch lg:grid-cols-12">
          {/* Clinic visual */}
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-teal-800 to-emerald-700 lg:col-span-7 lg:aspect-auto lg:min-h-[340px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={clinic.id}
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0.25 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0.25 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="relative h-full w-full"
              >
                <Image
                  src={img}
                  alt={`${clinic.name} in ${clinic.city}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-teal-950/65 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-xs font-medium text-white/95">
                  <span>{clinic.city}</span>
                  <span className="tabular-nums">
                    {clinic.doctorCount} {clinic.doctorCount === 1 ? "doctor" : "doctors"}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Clinic details */}
          <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-5">
            <div>
              <p className="text-xs font-medium text-teal-700">
                {clinic.city} · Partner Clinic
              </p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {clinic.name}
              </h3>

              <dl className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-600">
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                  <dd>
                    {clinic.address}, {clinic.city}
                  </dd>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                  <dd className="tabular-nums">
                    Open {clinic.openTime} – {clinic.closeTime}
                  </dd>
                </div>
                {clinic.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                    <dd className="tabular-nums">{clinic.phone}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
              <span className="text-sm font-medium text-slate-700 tabular-nums">
                {clinic.doctorCount} {clinic.doctorCount === 1 ? "specialist" : "specialists"} available
              </span>
              <Link
                href={`/clinics/${clinic.id}`}
                className="group inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white whitespace-nowrap transition-all duration-200 hover:bg-emerald-600 hover:shadow-md hover:shadow-teal-700/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                <span>View clinic</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Clinic selector strip */}
      {clinics.length > 1 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Select clinic">
          {clinics.map((item, i) => {
            const isSelected = i === active;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActive(i)}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                  isSelected
                    ? "border-teal-700 bg-teal-50/80 text-teal-950"
                    : "border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-slate-50"
                }`}
              >
                <div className="min-w-0 pr-3">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {item.city} · {item.doctorCount} doctors
                  </p>
                </div>
                <span className={`font-mono text-xs tabular-nums ${isSelected ? "text-teal-700 font-semibold" : "text-slate-400"}`}>
                  0{i + 1}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
