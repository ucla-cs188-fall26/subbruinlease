import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Tone = "error" | "success" | "info" | "warning";

const tones: Record<Tone, string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-bruin-200 bg-bruin-50 text-bruin-800",
  warning: "border-gold-200 bg-gold-50 text-gold-600",
};

export function Alert({ tone = "info", className, ...props }: ComponentProps<"div"> & { tone?: Tone }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-2xl border px-4 py-3 text-sm", tones[tone], className)}
      {...props}
    />
  );
}
