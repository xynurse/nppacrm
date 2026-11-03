export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--page)] px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_480px_at_50%_-10%,color-mix(in_srgb,var(--accent)_10%,transparent),transparent_55%)]"
      />
      <div className="relative w-full">{children}</div>
    </div>
  );
}
