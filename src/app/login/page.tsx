import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.role));

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <LoginForm />
    </main>
  );
}
