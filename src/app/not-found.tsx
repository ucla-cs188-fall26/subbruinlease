import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <BearHouse className="mb-6 h-28 w-auto" />
      <h1 className="text-3xl font-semibold sm:text-4xl">This room’s not available</h1>
      <p className="mt-3 max-w-md text-muted">
        The page you’re looking for doesn’t exist, or it hasn’t been built yet.
      </p>
      <ButtonLink href="/" className="mt-8">
        Back to Explore
      </ButtonLink>
    </Container>
  );
}

/** Little house with bear ears, echoing the logo. */
function BearHouse({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden>
      <circle cx="38" cy="22" r="11" fill="#f5ba3b" />
      <circle cx="38" cy="22" r="5" fill="#3166ab" />
      <circle cx="82" cy="22" r="11" fill="#f5ba3b" />
      <circle cx="82" cy="22" r="5" fill="#3166ab" />
      <path d="M14 52 L60 16 L106 52" fill="none" stroke="#3166ab" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="26" y="48" width="68" height="46" rx="8" fill="#f5ba3b" />
      <rect x="52" y="64" width="16" height="30" rx="4" fill="#3166ab" />
      <rect x="34" y="58" width="11" height="11" rx="2" fill="#fcf9f2" />
      <rect x="75" y="58" width="11" height="11" rx="2" fill="#fcf9f2" />
    </svg>
  );
}
