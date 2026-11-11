"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { initialFormState } from "@/lib/form-state";
import { updateProfile } from "./actions";

type Props = {
  displayName: string;
  gradYear: number | null;
  bio: string | null;
  welcome: boolean;
  next: string;
};

export function ProfileForm({ displayName, gradYear, bio, welcome, next }: Props) {
  const [state, action, pending] = useActionState(updateProfile, initialFormState);
  const [bioLength, setBioLength] = useState(bio?.length ?? 0);
  const err = (name: string) => state.fieldErrors?.[name]?.[0];

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => thisYear - 2 + i);

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      {welcome && (
        <>
          <input type="hidden" name="welcome" value="1" />
          <input type="hidden" name="next" value={next} />
        </>
      )}

      <Field
        label="Display name"
        htmlFor="displayName"
        error={err("displayName")}
        hint="Shown on your listings. A first name and last initial works well, like “Jordan L.”"
      >
        <Input
          id="displayName"
          name="displayName"
          defaultValue={displayName}
          maxLength={40}
          required
          aria-invalid={err("displayName") ? true : undefined}
        />
      </Field>

      <Field label="Graduation year" htmlFor="gradYear" error={err("gradYear")} hint="Optional">
        <Select id="gradYear" name="gradYear" defaultValue={gradYear?.toString() ?? ""}>
          <option value="">Prefer not to say</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Short bio"
        htmlFor="bio"
        error={err("bio")}
        hint={`Optional · ${bioLength}/300. Your major, schedule, what you're like as a roommate.`}
      >
        <Textarea
          id="bio"
          name="bio"
          defaultValue={bio ?? ""}
          maxLength={300}
          placeholder="Third-year psych major, early riser, very tidy."
          onChange={(e) => setBioLength(e.target.value.length)}
          aria-invalid={err("bio") ? true : undefined}
        />
      </Field>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : welcome ? "Save and continue" : "Save profile"}
      </Button>
    </form>
  );
}
