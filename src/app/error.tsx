"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/** Shown when a page crashes. The header and footer stay. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";

  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <p className="text-6xl" aria-hidden>
        🧸
      </p>
      <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Something went wrong</h1>
      <p className="mt-3 max-w-md text-muted">
        That’s on us, not you. Try again, and if it keeps happening, come back in a few minutes.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => retry()}>
          <RotateCcw className="size-4" aria-hidden />
          Try again
        </Button>
        <ButtonLink href="/" variant="outline">
          Back to Explore
        </ButtonLink>
      </div>
      {digest && <p className="mt-6 text-xs text-muted">Error code: {digest}</p>}
    </Container>
  );
}
