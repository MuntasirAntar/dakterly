import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/lib/auth";
import { first, type SearchParams } from "@/lib/params";
import { safeNextPath } from "@/lib/redirect";
import authBackdrop from "@/assets/images/auth_medical_backdrop_1794852044039.jpg";
import AuthShell from "@/components/AuthShell";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const next = safeNextPath(first((await searchParams).next));
  const user = await getCurrentUser();
  if (user) redirect(next ?? homePathFor(user.role));

  return (
    <AuthShell
      image={authBackdrop}
      imageAlt="Sunlit modern medical center atrium with greenery"
      eyebrow="Welcome back to Dakterly"
      heading="Manage your visits without the waiting room"
      description="Sign in to view your upcoming appointments, check live queue tokens, or open your clinic reception desk."
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
