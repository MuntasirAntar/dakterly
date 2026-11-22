import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SymptomChatPanel from "@/components/SymptomChatPanel";

export const metadata: Metadata = {
  title: "Chat with Agent · Dakterly",
  description:
    "Describe your symptoms in Bangla or English to get specialist guidance and find matching doctors across Bangladesh.",
};

export default function AgentPage() {
  return (
    <main className="flex-1 bg-slate-50/70 px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Chat with Agent
            </h1>
            <p className="mt-0.5 text-sm text-slate-600">
              Share your symptoms and area in Bangla or English to find the right specialist.
            </p>
          </div>
          <Link
            href="/doctors"
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-teal-800 whitespace-nowrap shrink-0 transition-colors hover:border-teal-600 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            <span>Browse all doctors</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="h-[calc(100dvh-13.5rem)] min-h-[480px] max-h-[720px] overflow-hidden rounded-2xl border border-emerald-900/15 bg-white shadow-sm font-[family-name:var(--font-noto-bengali),var(--font-plus-jakarta),ui-sans-serif,sans-serif]">
          <SymptomChatPanel mode="page" titleId="dakterly-agent-page-title" />
        </div>
      </div>
    </main>
  );
}
