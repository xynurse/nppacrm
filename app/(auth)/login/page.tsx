import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="mb-1 text-lg font-semibold tracking-tight">
        Sponsorship CRM
      </h1>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
        Sign in to continue.
      </p>
      <LoginForm />
    </div>
  );
}
