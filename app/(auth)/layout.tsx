// Auth routes live outside the admin shell. The shared wrapper is
// intentionally minimal so each page can own its own layout — login and
// signup are split-panel (pitch on the left, form on the right), whereas
// /auth/callback is a centered status screen.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="cr-surface flex min-h-screen flex-col">{children}</div>;
}
