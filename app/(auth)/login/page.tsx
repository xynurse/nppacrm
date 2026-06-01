import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="w-full max-w-sm">
      {/* Brand mark */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-900/40">
          <Activity className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          LPD Sponsor CRM
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Leadership &amp; Professional Development
        </p>
        <p className="text-xs text-slate-500">for NPs &amp; PAs</p>
      </div>

      {/* Login card */}
      <div className="rounded-xl border border-white/10 bg-white px-6 py-6 shadow-2xl">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          Sign in to your account
        </h2>
        <p className="mb-5 text-xs text-slate-500">
          Enter your credentials to continue.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
