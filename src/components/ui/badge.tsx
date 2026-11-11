import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Tone = "blue" | "gold" | "neutral" | "green" | "red";

const tones: Record<Tone, string> = {
  blue: "bg-bruin-50 text-bruin-700 ring-bruin-200",
  gold: "bg-gold-50 text-gold-600 ring-gold-200",
  neutral: "bg-cream-dark text-muted ring-line",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-red-200",
};

export function Badge({
  tone = "blue",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
