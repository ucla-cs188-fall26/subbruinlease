import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { UserMenu } from "./user-menu";

/**
 * Right side of the header. Reads the session, so it's rendered inside <Suspense>
 * in the root layout and streams in after the static header.
 */
export async function HeaderAccount() {
  const user = await getCurrentUser();

  return (
    <div className="flex items-center gap-2">
      {user ? (
        <>
          <ButtonLink href="/listings/new" variant="gold" size="sm" className="hidden md:inline-flex">
            <Plus className="size-4" aria-hidden />
            Post a sublease
          </ButtonLink>
          <UserMenu user={user} />
        </>
      ) : (
        <>
          <ButtonLink href="/login" variant="ghost" size="sm">
            Log in
          </ButtonLink>
          <ButtonLink href="/listings/new" variant="gold" size="sm" className="hidden md:inline-flex">
            <Plus className="size-4" aria-hidden />
            Post a sublease
          </ButtonLink>
        </>
      )}
    </div>
  );
}

export function HeaderAccountSkeleton() {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      <div className="hidden h-9 w-36 animate-pulse rounded-full bg-cream-dark md:block" />
      <div className="size-9 animate-pulse rounded-full bg-cream-dark" />
    </div>
  );
}
