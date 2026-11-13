import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";

/** Shared layout for text pages (safety tips, terms, privacy). */
export function ProsePage({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro: ReactNode;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      <p className="mt-3 text-lg text-muted">{intro}</p>
      {updated && <p className="mt-2 text-sm text-muted">Last updated {updated}</p>}
      <div className="prose-sbl mt-8">{children}</div>
    </Container>
  );
}

/** Where people can reach the team. Set NEXT_PUBLIC_SUPPORT_EMAIL to show an address. */
export function ContactLine() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return email ? (
    <>
      email us at <a href={`mailto:${email}`}>{email}</a>
    </>
  ) : (
    <>use the Report button on any listing</>
  );
}
