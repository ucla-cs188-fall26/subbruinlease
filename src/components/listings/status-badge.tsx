import { Badge } from "@/components/ui/badge";
import type { ListingStatus } from "@/lib/types";

const styles: Record<ListingStatus, { label: string; tone: "green" | "neutral" | "gold" | "red" }> = {
  published: { label: "Live", tone: "green" },
  draft: { label: "Draft", tone: "neutral" },
  unavailable: { label: "Unavailable", tone: "gold" },
  closed: { label: "Closed", tone: "neutral" },
  hidden: { label: "Hidden by moderators", tone: "red" },
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  const { label, tone } = styles[status];
  return (
    <Badge tone={tone}>
      {status === "published" && <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />}
      {label}
    </Badge>
  );
}
