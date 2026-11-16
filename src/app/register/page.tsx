import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/lib/auth";
import { first, type SearchParams } from "@/lib/params";
import { safeNextPath } from "@/lib/redirect";
import registerBackdrop from "@/assets/images/hero_clinic_care_1794851618508.jpg";
import AuthShell from "@/components/AuthShell";
import RegisterForm from "@/components/RegisterForm";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const next = safeNextPath(first((await searchParams).next));
  const user = await getCurrentUser();
  if (user) redirect(next ?? homePathFor(user.role));

  return (
    <AuthShell
      image={registerBackdrop}
      imageAlt="Bright modern clinic reception desk and calm waiting lounge"
      eyebrow="Create your patient account"
      heading="Book trusted specialists in under a minute"
      description="Register once to reserve time slots, receive a confirmed token number, and follow your place in line live."
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}
