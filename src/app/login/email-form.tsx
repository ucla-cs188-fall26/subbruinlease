"use client";

import { useActionState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { initialFormState } from "@/lib/form-state";
import { requestCode } from "./actions";

export function EmailForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(requestCode, initialFormState);
  const emailError = state.fieldErrors?.email?.[0];

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="next" value={next} />
      <Field label="UCLA email" htmlFor="email" error={emailError} hint="@ucla.edu or @g.ucla.edu">
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            required
            placeholder="joebruin@ucla.edu"
            className="pl-10"
            aria-invalid={emailError ? true : undefined}
          />
        </div>
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending code…" : "Send me a code"}
        {!pending && <ArrowRight className="size-4" aria-hidden />}
      </Button>
    </form>
  );
}
