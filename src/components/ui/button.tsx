import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "gold" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-bruin-500 to-bruin-700 text-white shadow-[0_4px_14px_rgb(49_102_171/0.3)] hover:from-bruin-600 hover:to-bruin-800",
  gold: "bg-gold-400 text-bruin-800 shadow-[0_4px_14px_rgb(245_186_59/0.35)] hover:bg-gold-300",
  outline:
    "border-2 border-bruin-200 bg-white text-bruin-700 hover:border-bruin-400 hover:bg-bruin-50",
  ghost: "text-bruin-700 hover:bg-bruin-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-base",
  lg: "h-13 px-7 text-lg",
};

type StyleProps = { variant?: Variant; size?: Size };

export function buttonStyles({ variant = "primary", size = "md" }: StyleProps = {}) {
  return cn(base, variants[variant], sizes[size]);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & StyleProps) {
  return (
    <button
      type={type}
      className={cn(buttonStyles({ variant, size }), className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}
