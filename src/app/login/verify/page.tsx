import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { AuthShell, FormSkeleton } from "@/components/auth/auth-shell";
import { isMockAuth } from "@/lib/auth/current-user";
import { isUclaEmail, normalizeEmail, safeNextPath } from "@/lib/auth/email";
import { peekDevLoginCode } from "@/lib/auth/login-codes";
import { CodeForm } from "./code-form";

export const metadata: Metadata = { title: "Enter your code" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function VerifyPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AuthShell title="Check your email">
      <Suspense fallback={<FormSkeleton />}>
        <VerifyContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function VerifyContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const email = normalizeEmail(typeof params.email === "string" ? params.email : "");
  const next = safeNextPath(params.next);
  if (!isUclaEmail(email)) redirect(`/login?next=${encodeURIComponent(next)}`);

  const devCode = isMockAuth() ? peekDevLoginCode(email) : null;

  return (
    <>
      <p className="-mt-4 mb-6 text-muted">
        We sent a 6-digit code to <span className="font-bold text-ink">{email}</span>.{" "}
        {isMockAuth() ? "It expires in 10 minutes." : "It can only be used once."}{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-bold text-bruin-600 hover:underline">
          Use a different email
        </Link>
      </p>

      {devCode && (
        <div className="mb-6 rounded-2xl border border-dashed border-gold-300 bg-gold-50/60 p-4 text-sm">
          <p className="flex items-center gap-1.5 font-bold text-gold-700">
            <FlaskConical className="size-4" aria-hidden />
            Dev mode: emails aren&apos;t sent yet
          </p>
          <p className="mt-1 text-muted">
            Your code is <span className="font-display text-lg font-semibold tracking-widest text-ink">{devCode}</span>
          </p>
        </div>
      )}

      <CodeForm email={email} next={next} />
    </>
  );
}
