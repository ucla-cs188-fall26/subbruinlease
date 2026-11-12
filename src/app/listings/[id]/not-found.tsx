import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function ListingNotFound() {
  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <span className="mb-6 inline-flex size-20 items-center justify-center rounded-full bg-bruin-50 text-bruin-400">
        <SearchX className="size-9" aria-hidden />
      </span>
      <h1 className="text-3xl font-semibold sm:text-4xl">This listing isn’t available</h1>
      <p className="mt-3 max-w-md text-muted">
        It may have been taken down by the poster, or the link might be wrong. There are plenty of
        other places to check out.
      </p>
      <ButtonLink href="/" className="mt-8">
        Browse subleases
      </ButtonLink>
    </Container>
  );
}
