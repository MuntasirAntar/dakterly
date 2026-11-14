import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/lib/auth";
import RegisterForm from "@/components/RegisterForm";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.role));

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <RegisterForm />
    </main>
  );
}
