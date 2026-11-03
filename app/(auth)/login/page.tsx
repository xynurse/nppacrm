import { redirect } from "next/navigation";
import { getVerifiedSession } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";
import { LogoMark } from "@/components/app/logo-mark";

export default async function LoginPage() {
  // Verified (DB-checked) so a deactivated user with a live cookie lands on
  // the form instead of bouncing between / and /login.
  const session = await getVerifiedSession();
  if (session) redirect("/");

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8 text-center">
        <LogoMark
          className="mx-auto mb-4 h-12 w-12 rounded-2xl shadow-[var(--shadow-raised)]"
          glyphClassName="h-7 w-7"
        />
        <h1 className="font-display text-xl font-semibold tracking-tight text-zinc-900">
          LPD Sponsor CRM
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Leadership &amp; Professional Development
        </p>
        <p className="text-xs text-zinc-400">for NPs &amp; PAs</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white px-6 py-6 shadow-[var(--shadow-card)]">
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
