import LoginClient from "./LoginClient";

// force-dynamic prevents Next.js from prerendering this page at build time,
// which would fail without real Supabase env vars.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginClient />;
}
