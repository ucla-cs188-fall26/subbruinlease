import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell, FormSkeleton } from "@/components/auth/auth-shell";
import { getCurrentUser, isMockAuth } from "@/lib/auth/current-user";
import { safeNextPath } from "@/lib/auth/email";
import { EmailForm } from "./email-form";
import { DevSignIn } from "./dev-sign-in";

export const metadata: Metadata = { title: "Log in" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AuthShell
      title="Log in or sign up"
      subtitle="Use your UCLA email. We'll send you a 6-digit code, so there's no password to remember."
    >
      <Suspense fallback={<FormSkeleton />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function LoginContent({ searchParams }: { searchParams: SearchParams }) {
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);

  return (
    <>
      <EmailForm next={next} />
      <p className="mt-6 text-xs text-muted">
        Verifying your email confirms you have a UCLA address. It doesn&apos;t mean subBruinLease
        has vetted you or anyone else, so always meet safely and never pay before seeing a place.
      </p>
      {isMockAuth() && <DevSignIn next={next} />}
    </>
  );
}
