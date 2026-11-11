import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LogOut, MailCheck, PartyPopper } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { FormSkeleton } from "@/components/auth/auth-shell";
import { requireUser } from "@/lib/auth/current-user";
import { safeNextPath } from "@/lib/auth/email";
import { getDataStore } from "@/lib/data";
import { signOut } from "@/app/login/actions";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Your profile" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ProfilePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <Suspense
        fallback={
          <Card className="p-6 sm:p-8">
            <FormSkeleton />
          </Card>
        }
      >
        <ProfileContent searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function ProfileContent({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/profile");
  const profile = await getDataStore().profiles.get(user.id);
  if (!profile) notFound();

  const params = await searchParams;
  const welcome = params.welcome === "1";
  const next = safeNextPath(params.next);

  return (
    <>
      {welcome && (
        <div className="mb-6 flex items-start gap-3 rounded-card border border-gold-200 bg-gold-50 p-5">
          <PartyPopper className="mt-0.5 size-5 shrink-0 text-gold-600" aria-hidden />
          <div>
            <p className="font-display text-lg font-semibold text-bruin-700">Welcome to subBruinLease!</p>
            <p className="text-sm text-muted">
              Your email is verified. Take a second to set up how other Bruins will see you.
            </p>
          </div>
        </div>
      )}

      <Card className="p-6 sm:p-8">
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <Avatar name={profile.displayName} src={profile.avatarUrl} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold sm:text-3xl">{profile.displayName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="truncate">{profile.email}</span>
              {profile.emailVerified && (
                <Badge tone="green">
                  <MailCheck className="size-3.5" aria-hidden />
                  UCLA email verified
                </Badge>
              )}
            </div>
          </div>
        </div>

        <ProfileForm
          displayName={profile.displayName}
          gradYear={profile.gradYear}
          bio={profile.bio}
          welcome={welcome}
          next={next}
        />
      </Card>

      <p className="mt-4 px-1 text-xs text-muted">
        Your email is never shown on listings. When someone contacts you, we forward their message
        so you can decide whether to reply.
      </p>

      {!welcome && (
        <form action={signOut} className="mt-8">
          <Button type="submit" variant="ghost" size="sm">
            <LogOut className="size-4" aria-hidden />
            Log out
          </Button>
        </form>
      )}
    </>
  );
}
