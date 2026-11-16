import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { CalendarCheck2, Clock, Mail, MapPin, Phone, Users } from "lucide-react";
import partnerPhoto from "@/assets/images/clinic_partnership_doctors_1794852044117.jpg";
import PartnerClinicForm from "@/components/PartnerClinicForm";

export const metadata: Metadata = {
  title: "Join Dakterly for Clinics | Dakterly",
  description: "Partner your clinic with Dakterly for online slot booking and live queue management.",
};

const benefits = [
  {
    icon: CalendarCheck2,
    title: "Structured time-slot booking",
    text: "Publish each doctor's weekly chambers and consultation slots so patients book confirmed tokens online.",
  },
  {
    icon: Users,
    title: "Live reception queue desk",
    text: "Check patients in, start consultations, and track waiting counts from one auto-refreshing clinic dashboard.",
  },
  {
    icon: Clock,
    title: "Calmer waiting rooms",
    text: "Patients track their token position from home and arrive closer to their turn, reducing lobby crowding.",
  },
];

export default function JoinClinicPage() {
  return (
    <main className="flex-1 bg-emerald-50/40">
      {/* Emerald hero header */}
      <section className="relative overflow-hidden bg-teal-900 text-white">
        <div className="pointer-events-none absolute inset-0">
          <Image
            src={partnerPhoto}
            alt="Clinic director and receptionist coordinating schedules on a tablet"
            fill
            priority
            sizes="100vw"
            referrerPolicy="no-referrer"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-teal-950/92 via-teal-900/82 to-emerald-800/70" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-sm font-medium text-emerald-300">For Clinics &amp; Medical Centers</p>
          <h1 className="mt-2 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            Bring your clinic onto Dakterly
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-teal-50/90 sm:text-lg">
            Offer patients effortless slot booking and live queue visibility while giving your reception team a fast daily console.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#contact-form"
              className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-teal-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-400"
            >
              Request clinic onboarding
            </a>
            <a
              href="mailto:partnerships@dakterly.com?subject=Clinic%20Partnership%20Inquiry"
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email partnerships@dakterly.com
            </a>
          </div>
        </div>
      </section>

      {/* Benefits strip */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {benefits.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Contact & Emailing section */}
      <section id="contact-form" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="rounded-2xl border border-teal-800/15 bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-800 p-7 text-white shadow-sm lg:col-span-5">
            <h2 className="text-2xl font-bold tracking-tight">Contact our clinic team</h2>
            <p className="mt-2 text-sm leading-relaxed text-teal-100/90">
              Send your clinic details using the form or email us directly. Our onboarding team sets up your doctors, weekly schedules, and reception accounts.
            </p>

            <dl className="mt-8 space-y-5 border-t border-white/15 pt-6 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
                <div>
                  <dt className="text-xs text-emerald-200">Partnership email</dt>
                  <dd className="mt-0.5 font-semibold">
                    <a
                      href="mailto:partnerships@dakterly.com?subject=Clinic%20Partnership%20Inquiry"
                      className="underline decoration-emerald-300/60 underline-offset-4 hover:text-emerald-200"
                    >
                      partnerships@dakterly.com
                    </a>
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
                <div>
                  <dt className="text-xs text-emerald-200">Onboarding desk</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">01700-000001 (09:00 – 21:00)</dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
                <div>
                  <dt className="text-xs text-emerald-200">Coverage</dt>
                  <dd className="mt-0.5">Dhaka, Chattogram &amp; expanding nationwide</dd>
                </div>
              </div>
            </dl>

            <div className="mt-8 border-t border-white/15 pt-5 text-xs text-teal-100/80">
              Already a partner clinic receptionist?{" "}
              <Link href="/login" className="font-semibold text-emerald-300 underline hover:text-white">
                Log in to your clinic dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:col-span-7">
            <h2 className="text-xl font-bold text-slate-900">Clinic partnership inquiry</h2>
            <p className="mt-1 text-sm text-slate-600">
              Fill out the form below to submit your request or open it directly in your email client.
            </p>
            <div className="mt-6">
              <PartnerClinicForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
