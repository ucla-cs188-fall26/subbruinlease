"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { initialFormState } from "@/lib/form-state";
import { resendCode, verifyCode } from "../actions";

export function CodeForm({ email, next }: { email: string; next: string }) {
  const [state, action, pending] = useActionState(verifyCode, initialFormState);
  const [resendState, resendAction, resending] = useActionState(resendCode, initialFormState);
  const codeError = state.fieldErrors?.code?.[0];

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4" noValidate>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <Field label="6-digit code" htmlFor="code" error={codeError}>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            autoFocus
            required
            placeholder="123456"
            className="h-14 text-center font-display text-2xl tracking-[0.5em]"
            aria-invalid={codeError ? true : undefined}
          />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Checking…" : "Verify and continue"}
        </Button>
      </form>

      <form action={resendAction} className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <input type="hidden" name="email" value={email} />
        <span className="text-muted">Didn&apos;t get it? Check spam, or</span>
        <button
          type="submit"
          disabled={resending}
          className="font-bold text-bruin-600 hover:underline disabled:opacity-50"
        >
          {resending ? "Sending…" : "send a new code"}
        </button>
      </form>
      {resendState.error && <Alert tone="error">{resendState.error}</Alert>}
      {resendState.message && <Alert tone="success">{resendState.message}</Alert>}
    </div>
  );
}
