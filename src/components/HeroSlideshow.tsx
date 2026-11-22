"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import heroConsultation from "@/assets/images/hero_doctor_consultation_1794851618032.jpg";
import heroTeam from "@/assets/images/hero_medical_team_1794851618083.jpg";
import heroClinic from "@/assets/images/hero_clinic_care_1794851618508.jpg";
import SearchForm from "@/components/SearchForm";

const HERO_SLIDES = [
  {
    src: heroConsultation,
    alt: "Physician consulting attentively with a patient in a sunlit clinic room",
    caption: "Warm, unhurried consultations with verified specialists",
  },
  {
    src: heroTeam,
    alt: "Two medical specialists reviewing patient charts together in a modern clinic",
    caption: "Coordinated care across 10+ medical specialties",
  },
  {
    src: heroClinic,
    alt: "Modern outpatient clinic reception and calm green waiting lounge",
    caption: "Check your live token from home and arrive right on time",
  },
];

type Props = {
  cities: string[];
  popularSpecialties: string[];
};

export default function HeroSlideshow({ cities, popularSpecialties }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [paused]);

  const current = HERO_SLIDES[index];
  const prev = () => setIndex((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  const next = () => setIndex((i) => (i + 1) % HERO_SLIDES.length);

  return (
    <section
      aria-label="Find a doctor"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative overflow-hidden bg-gradient-to-br from-teal-950 via-teal-800 to-emerald-700 text-white"
    >
      {/* Background medical & doctor photo slideshow */}
      <div className="pointer-events-none absolute inset-0">
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={index}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={current.src}
              alt={current.alt}
              fill
              loading="eager"
              fetchPriority={index === 0 ? "high" : "auto"}
              sizes="100vw"
              referrerPolicy="no-referrer"
              className="object-cover object-center"
            />
          </motion.div>
        </AnimatePresence>

        {/* Rich emerald-teal scrim preserving green brand identity and high text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-teal-950/90 via-teal-900/80 to-emerald-800/65" />
        <div className="absolute inset-0 bg-gradient-to-t from-teal-950/70 via-transparent to-teal-950/30" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-18 lg:py-24">
        <div className="max-w-3xl">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-[3.25rem] lg:leading-[1.12]">
            Find a doctor. Skip the waiting room.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-teal-50/95 sm:mt-4 sm:text-lg">
            Book an appointment at trusted clinics and follow your place in the queue live, from home.
          </p>

          <div className="mt-6 sm:mt-8">
            <SearchForm cities={cities} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-3.5 gap-y-2 text-xs text-teal-50/90 sm:mt-5 sm:gap-x-4 sm:text-sm">
            <span className="font-medium text-emerald-200">Popular:</span>
            {popularSpecialties.map((name) => (
              <Link
                key={name}
                href={`/doctors?specialty=${encodeURIComponent(name)}`}
                className="underline decoration-emerald-300/50 underline-offset-4 transition-colors duration-200 hover:text-white hover:decoration-white whitespace-nowrap"
              >
                {name}
              </Link>
            ))}
          </div>
        </div>

        {/* Slideshow caption + controls */}
        <div className="mt-7 flex flex-col gap-3 border-t border-white/15 pt-4 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pt-5">
          <p className="text-xs font-medium text-teal-50/90 sm:text-sm" aria-live="polite">
            <span className="mr-2 font-mono text-xs text-emerald-300 tabular-nums">
              0{index + 1} / 0{HERO_SLIDES.length}
            </span>
            {current.caption}
          </p>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Choose hero slide">
              {HERO_SLIDES.map((slide, i) => (
                <button
                  key={slide.alt}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    i === index ? "w-7 bg-emerald-300" : "w-2 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prev}
                aria-label="Previous medical photo"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/25 bg-teal-950/40 text-white backdrop-blur-sm transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next medical photo"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/25 bg-teal-950/40 text-white backdrop-blur-sm transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
