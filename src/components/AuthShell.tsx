import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { CalendarCheck2, Clock, ShieldCheck } from "lucide-react";

type Props = {
  image: StaticImageData;
  imageAlt: string;
  eyebrow: string;
  heading: string;
  description: string;
  children: React.ReactNode;
};

export default function AuthShell({ image, imageAlt, eyebrow, heading, description, children }: Props) {
  return (
    <main className="relative flex flex-1 items-center overflow-hidden bg-teal-950 px-4 py-8 sm:px-6 sm:py-12">
      {/* Full-bleed background photography with emerald-teal gradient scrim */}
      <div className="pointer-events-none absolute inset-0">
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          sizes="100vw"
          referrerPolicy="no-referrer"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-950/90 via-teal-900/82 to-emerald-800/75" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-12 lg:gap-10">
        {/* Form container first on phones */}
        <div className="order-1 flex justify-center lg:order-2 lg:col-span-6 lg:justify-end">
          {children}
        </div>

        {/* Colored brand context panel */}
        <section className="order-2 text-white lg:order-1 lg:col-span-6">
          <p className="text-sm font-medium text-emerald-300">{eyebrow}</p>
          <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-2.5 max-w-md text-sm leading-relaxed text-teal-50/90 sm:mt-3 sm:text-base">
            {description}
          </p>

          <ul className="mt-6 space-y-3 text-sm text-teal-50/90 sm:mt-8 sm:space-y-3.5">
            <li className="flex items-center gap-3">
              <CalendarCheck2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
              <span>Book open chamber slots across verified clinics</span>
            </li>
            <li className="flex items-center gap-3">
              <Clock className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
              <span>Follow your live token position from home</span>
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
              <span>Pay consultation fees directly at the clinic counter</span>
            </li>
          </ul>

          <p className="mt-6 text-xs text-teal-100/75 sm:mt-8">
            Representing a clinic?{" "}
            <Link href="/join-clinic" className="font-semibold text-emerald-300 underline hover:text-white">
              Contact us to join Dakterly
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
