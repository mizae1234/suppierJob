export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page uses its own full-screen layout without AppShell (no sidebar/header)
  return <>{children}</>;
}
