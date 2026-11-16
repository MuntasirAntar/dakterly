import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/lib/auth";
import { first, type SearchParams } from "@/lib/params";
import { safeNextPath } from "@/lib/redirect";
import RegisterForm from "@/components/RegisterForm";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const next = safeNextPath(first((await searchParams).next));
  const user = await getCurrentUser();
  if (user) redirect(next ?? homePathFor(user.role));

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <RegisterForm next={next} />
    </main>
  );
}
