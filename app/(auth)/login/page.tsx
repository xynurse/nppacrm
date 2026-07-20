import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";
import { LogoMark } from "@/components/app/logo-mark";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="w-full max-w-sm">
      {/* Brand mark */}
      <div className="mb-8 text-center">
        <LogoMark
          className="mx-auto mb-4 h-14 w-14 rounded-2xl shadow-lg shadow-brand-950/40"
          glyphClassName="h-8 w-8"
        />
        <h1 className="text-xl font-bold tracking-tight text-white">
          LPD Sponsor CRM
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Leadership &amp; Professional Development
        </p>
        <p className="text-xs text-zinc-500">for NPs &amp; PAs</p>
      </div>

      {/* Login card */}
      <div className="rounded-xl border border-white/10 bg-white px-6 py-6 shadow-2xl">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">
          Sign in to your account
        </h2>
        <p className="mb-5 text-xs text-zinc-500">
          Enter your credentials to continue.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
