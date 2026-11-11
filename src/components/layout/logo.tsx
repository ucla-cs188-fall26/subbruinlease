import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Link href="/" aria-label="subBruinLease home" className={cn("inline-block shrink-0", className)}>
      <Image
        src="/brand/logo.png"
        alt="subBruinLease"
        width={850}
        height={190}
        priority={priority}
        className="h-full w-auto"
      />
    </Link>
  );
}
