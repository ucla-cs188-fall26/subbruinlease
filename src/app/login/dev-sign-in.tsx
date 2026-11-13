import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { devSignIn } from "./actions";

/** Mock mode only: skip the code and sign in as a fake account. */
export function DevSignIn({ next }: { next: string }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-gold-300 bg-gold-50/60 p-4">
      <p className="flex items-center gap-1.5 text-sm font-bold text-gold-700">
        <FlaskConical className="size-4" aria-hidden />
        Dev mode: quick sign-in
      </p>
      <p className="mt-1 text-xs text-muted">Only shown while using fake data.</p>
      <form action={devSignIn} className="mt-3 flex flex-wrap gap-2">
        <input type="hidden" name="next" value={next} />
        <Button type="submit" name="email" value="demo@ucla.edu" variant="outline" size="sm">
          Demo Bruin
        </Button>
        <Button type="submit" name="email" value="admin@ucla.edu" variant="outline" size="sm">
          Admin
        </Button>
      </form>
    </div>
  );
}
