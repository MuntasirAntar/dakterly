import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-sm font-semibold text-white whitespace-nowrap shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Back</span>
    </Link>
  );
}
