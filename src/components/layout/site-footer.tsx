import Link from "next/link";
import { Container } from "@/components/ui/container";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line/70 bg-cream-dark/60">
      <Container className="flex flex-col gap-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-display font-semibold text-bruin-700">subBruinLease</span> · Short-term
          housing, Bruin to Bruin.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/safety" className="hover:text-bruin-700">
            Safety tips
          </Link>
          <Link href="/terms" className="hover:text-bruin-700">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-bruin-700">
            Privacy
          </Link>
        </nav>
      </Container>
      <Container className="pb-8 text-xs text-muted">
        Not affiliated with or endorsed by UCLA. Always confirm your lease allows subleasing.
      </Container>
    </footer>
  );
}
