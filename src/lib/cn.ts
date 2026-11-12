import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge about the custom theme tokens in globals.css.
const twMerge = extendTailwindMerge({
  extend: { theme: { radius: ["card"], shadow: ["soft", "lift"] } },
});

/**
 * Join class names, skipping falsy values. Conflicting Tailwind classes resolve to the
 * last one, so `cn("h-11", "h-10")` → "h-10" and callers can override component defaults.
 */
export function cn(...classes: Array<string | false | null | undefined>) {
  return twMerge(classes.filter(Boolean).join(" "));
}
