import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

/** Centered card layout for sign-in screens. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Container className="flex justify-center py-12 sm:py-20">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </Card>
    </Container>
  );
}

export function FormSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      <div className="h-4 w-24 rounded-full bg-cream-dark" />
      <div className="h-11 rounded-2xl bg-cream-dark" />
      <div className="h-11 rounded-full bg-cream-dark" />
    </div>
  );
}
