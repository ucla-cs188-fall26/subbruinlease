"use client";

import { startTransition, useActionState, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { initialFormState, type FormState } from "@/lib/form-state";
import { amenityLabels, housingTypeLabels, leasePermissionLabels } from "@/lib/labels";
import { AMENITIES, NEIGHBORHOODS, type ListingInput } from "@/lib/types";
import { PhotoUploader } from "./photo-uploader";

export type ListingFormValues = Partial<ListingInput>;

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: ListingFormValues;
  /**
   * "create" and "edit-draft" show Save draft + Publish (with the confirmation checkbox).
   * "edit" (a live or unavailable listing) shows a single Save button.
   */
  mode?: "create" | "edit-draft" | "edit";
  /** Today in LA, "YYYY-MM-DD", for date input minimums. */
  today: string;
};

const roomTypeOptions = [
  { value: "private", label: "Private room", hint: "Their own bedroom, shared common areas" },
  { value: "shared", label: "Shared room", hint: "Sharing a bedroom with someone" },
  { value: "entire", label: "Entire place", hint: "The whole unit to themselves" },
] as const;

const leaseOptions = [
  { value: "allowed", hint: "My lease explicitly allows subleasing." },
  { value: "landlord_approved", hint: "I have written approval from my landlord or property manager." },
  { value: "pending", hint: "I've asked my landlord and am waiting to hear back. Your listing will say so." },
] as const;

const bathroomOptions = ["1", "1.5", "2", "2.5", "3", "3.5", "4"];

export function ListingForm({ action, initial = {}, mode = "create", today }: Props) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [submitter, setSubmitter] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [utilitiesIncluded, setUtilitiesIncluded] = useState(initial.utilitiesIncluded ?? false);
  const [counts, setCounts] = useState({
    title: initial.title?.length ?? 0,
    description: initial.description?.length ?? 0,
  });
  const [from, setFrom] = useState(initial.availableFrom ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const canPublish = mode !== "edit";
  // Fields edited since the last submit. Their old errors are hidden so fixes show right away.
  const [edited, setEdited] = useState<{ state: FormState; names: Set<string> }>({ state, names: new Set() });
  const editedNames = edited.state === state ? edited.names : new Set<string>();
  const err = (name: string) => (editedNames.has(name) ? undefined : state.fieldErrors?.[name]?.[0]);
  const invalid = (name: string) => (err(name) ? true : undefined);
  const markEdited = (name: string) => {
    if (!state.fieldErrors?.[name] || editedNames.has(name)) return;
    setEdited({ state, names: new Set(editedNames).add(name) });
  };
  const markDirty = useCallback(() => setDirty(true), []);
  const photosChanged = () => {
    setDirty(true);
    markEdited("photos");
  };

  // After a failed submit, bring the first problem into view.
  useEffect(() => {
    if (!state.fieldErrors && !state.error) return;
    const first = formRef.current?.querySelector<HTMLElement>("[aria-invalid=true], [data-error=true]");
    (first ?? formRef.current)?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (first && "focus" in first) first.focus({ preventScroll: true });
  }, [state]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty || pending) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  return (
    <form
      ref={formRef}
      noValidate
      onChange={(e) => {
        markDirty();
        const name = (e.target as Partial<HTMLInputElement>).name;
        if (name) markEdited(name);
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (uploading) return;
        const button = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        setSubmitter(button?.value ?? null);
        // Submitting manually (instead of <form action>) keeps what was typed if there are errors.
        const data = new FormData(e.currentTarget, button);
        startTransition(() => formAction(data));
      }}
      className="space-y-6"
    >
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Section step={1} title="The basics">
        <Field
          label="Title"
          htmlFor="title"
          error={err("title")}
          hint={`${counts.title}/90 · Say what it is and where. e.g. “Private room on Landfair, 5 min to campus”`}
        >
          <Input
            id="title"
            name="title"
            defaultValue={initial.title}
            maxLength={90}
            aria-invalid={invalid("title")}
            onChange={(e) => setCounts((c) => ({ ...c, title: e.target.value.length }))}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Neighborhood" htmlFor="neighborhood" error={err("neighborhood")}>
            <Select
              id="neighborhood"
              name="neighborhood"
              defaultValue={initial.neighborhood ?? ""}
              aria-invalid={invalid("neighborhood")}
            >
              <option value="" disabled>
                Choose one
              </option>
              {NEIGHBORHOODS.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </Select>
          </Field>
          <Field
            label="Rough location"
            htmlFor="locationHint"
            error={err("locationHint")}
            hint="Cross streets only. No street number or unit."
          >
            <Input
              id="locationHint"
              name="locationHint"
              defaultValue={initial.locationHint}
              maxLength={80}
              placeholder="Landfair near Strathmore"
              aria-invalid={invalid("locationHint")}
            />
          </Field>
        </div>

        <fieldset data-error={err("roomType") ? true : undefined}>
          <legend className="mb-1.5 text-sm font-bold text-ink">What are you offering?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {roomTypeOptions.map((o) => (
              <ChoiceCard
                key={o.value}
                name="roomType"
                value={o.value}
                defaultChecked={initial.roomType === o.value}
                label={o.label}
                hint={o.hint}
              />
            ))}
          </div>
          <ErrorText>{err("roomType")}</ErrorText>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Type of housing" htmlFor="housingType" error={err("housingType")}>
            <Select
              id="housingType"
              name="housingType"
              defaultValue={initial.housingType ?? "apartment"}
              aria-invalid={invalid("housingType")}
            >
              {Object.entries(housingTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:pt-7">
            <Toggle name="furnished" defaultChecked={initial.furnished ?? false} label="It’s furnished" />
          </div>
        </div>
      </Section>

      <Section step={2} title="Dates and price">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Move-in date" htmlFor="availableFrom" error={err("availableFrom")}>
            <Input
              id="availableFrom"
              name="availableFrom"
              type="date"
              min={today}
              defaultValue={initial.availableFrom}
              onChange={(e) => setFrom(e.target.value)}
              aria-invalid={invalid("availableFrom")}
            />
          </Field>
          <Field label="Move-out date" htmlFor="availableTo" error={err("availableTo")}>
            <Input
              id="availableTo"
              name="availableTo"
              type="date"
              min={from || today}
              defaultValue={initial.availableTo}
              aria-invalid={invalid("availableTo")}
            />
          </Field>
        </div>
        <Toggle
          name="flexibleDates"
          defaultChecked={initial.flexibleDates ?? false}
          label="My dates are flexible"
          hint="Shows up in searches up to a week outside your dates."
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Monthly rent" htmlFor="rent" error={err("rent")}>
            <MoneyInput id="rent" defaultValue={initial.rent} invalid={invalid("rent")} placeholder="1,200" />
          </Field>
          <Field label="Security deposit" htmlFor="securityDeposit" error={err("securityDeposit")} hint="Optional. Leave blank if none.">
            <MoneyInput
              id="securityDeposit"
              defaultValue={initial.securityDeposit ?? undefined}
              invalid={invalid("securityDeposit")}
            />
          </Field>
        </div>

        <div className="grid items-start gap-5 sm:grid-cols-2">
          <div className="sm:pt-7">
            <Toggle
              name="utilitiesIncluded"
              defaultChecked={utilitiesIncluded}
              onChange={setUtilitiesIncluded}
              label="Utilities are included"
            />
          </div>
          {!utilitiesIncluded && (
            <Field
              label="Utilities estimate"
              htmlFor="utilitiesEstimate"
              error={err("utilitiesEstimate")}
              hint="Optional. About how much per month?"
            >
              <MoneyInput
                id="utilitiesEstimate"
                defaultValue={initial.utilitiesEstimate ?? undefined}
                invalid={invalid("utilitiesEstimate")}
                placeholder="60"
              />
            </Field>
          )}
        </div>
      </Section>

      <Section step={3} title="The space">
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          <Field label="Bedrooms" htmlFor="bedrooms" error={err("bedrooms")}>
            <Select id="bedrooms" name="bedrooms" defaultValue={String(initial.bedrooms ?? 1)}>
              <option value="0">Studio</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </Select>
          </Field>
          <Field label="Bathrooms" htmlFor="bathrooms" error={err("bathrooms")}>
            <Select id="bathrooms" name="bathrooms" defaultValue={String(initial.bathrooms ?? 1)}>
              {bathroomOptions.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </Select>
          </Field>
          <Field label="Roommates" htmlFor="roommates" error={err("roommates")}>
            <Select id="roommates" name="roommates" defaultValue={String(initial.roommates ?? 0)}>
              {Array.from({ length: 9 }, (_, n) => (
                <option key={n} value={n}>
                  {n === 0 ? "None" : n}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="-mt-3 text-sm text-muted">Roommates means other people living there during the sublease.</p>

        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">Amenities</legend>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => (
              <label key={a} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="amenities"
                  value={a}
                  defaultChecked={initial.amenities?.includes(a)}
                  className="peer sr-only"
                />
                <span className="inline-block rounded-full border-2 border-line bg-white px-3 py-1 text-sm font-bold text-ink transition-colors peer-checked:border-bruin-600 peer-checked:bg-bruin-600 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bruin-500 hover:border-bruin-300">
                  {amenityLabels[a]}
                </span>
              </label>
            ))}
          </div>
          <ErrorText>{err("amenities")}</ErrorText>
        </fieldset>

        <Field
          label="Description"
          htmlFor="description"
          error={err("description")}
          hint={`${counts.description}/4,000 · What’s the place like? Who are the roommates? What’s nearby?`}
        >
          <Textarea
            id="description"
            name="description"
            defaultValue={initial.description}
            maxLength={4000}
            rows={7}
            aria-invalid={invalid("description")}
            onChange={(e) => setCounts((c) => ({ ...c, description: e.target.value.length }))}
          />
        </Field>

        <Field label="House rules" htmlFor="houseRules" error={err("houseRules")} hint="Optional. Quiet hours, guests, pets, smoking…">
          <Textarea
            id="houseRules"
            name="houseRules"
            defaultValue={initial.houseRules ?? ""}
            maxLength={1000}
            rows={3}
            className="min-h-20"
            aria-invalid={invalid("houseRules")}
          />
        </Field>
      </Section>

      <Section step={4} title="Photos" subtitle="Listings with photos get a lot more messages. You need at least one to publish.">
        <div data-error={err("photos") ? true : undefined}>
          <PhotoUploader
            initial={initial.images ?? []}
            error={err("photos")}
            onBusyChange={setUploading}
            onChange={photosChanged}
          />
        </div>
      </Section>

      <Section step={5} title="Sublease permission">
        <fieldset data-error={err("leasePermission") ? true : undefined}>
          <legend className="mb-2 text-sm text-muted">
            Many leases need the landlord’s OK before subleasing. Which is true for you?
          </legend>
          <div className="space-y-2">
            {leaseOptions.map((o) => (
              <ChoiceCard
                key={o.value}
                name="leasePermission"
                value={o.value}
                defaultChecked={initial.leasePermission === o.value}
                label={leasePermissionLabels[o.value]}
                hint={o.hint}
              />
            ))}
          </div>
          <ErrorText>{err("leasePermission")}</ErrorText>
        </fieldset>

        {canPublish && (
          <div data-error={err("confirm") ? true : undefined}>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-cream-dark/60 p-4">
              <input
                type="checkbox"
                name="confirm"
                className="mt-0.5 size-5 shrink-0 accent-bruin-600"
                aria-invalid={invalid("confirm")}
              />
              <span className="text-sm text-ink">
                I’m a UCLA student subleasing a place I live in, the details above are accurate, and I
                understand subBruinLease doesn’t verify leases.
              </span>
            </label>
            <ErrorText>{err("confirm")}</ErrorText>
          </div>
        )}
      </Section>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-2 border-t border-line/70 bg-cream/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-end sm:rounded-card sm:border sm:px-5">
        {uploading && (
          <p className="text-sm text-muted sm:mr-auto" role="status">
            <Loader2 className="mr-1 inline size-4 animate-spin" aria-hidden />
            Waiting for photos to finish uploading…
          </p>
        )}
        {canPublish ? (
          <>
            <Button type="submit" name="intent" value="draft" variant="outline" disabled={pending || uploading}>
              {pending && submitter === "draft" ? "Saving…" : "Save as draft"}
            </Button>
            <Button type="submit" name="intent" value="publish" disabled={pending || uploading}>
              {pending && submitter === "publish" ? "Publishing…" : "Publish listing"}
            </Button>
          </>
        ) : (
          <Button type="submit" name="intent" value="save" disabled={pending || uploading}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        )}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function Section({
  step,
  title,
  subtitle,
  children,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`step-${step}`}
      className="rounded-card border border-line/70 bg-white p-5 shadow-soft sm:p-7"
    >
      <h2 id={`step-${step}`} className="flex items-center gap-3 text-xl font-semibold">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-gold-100 font-display text-base text-bruin-700">
          {step}
        </span>
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm text-muted sm:ml-11">{subtitle}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-sm text-red-600">{children}</p>;
}

function ChoiceCard({
  name,
  value,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  hint: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="block cursor-pointer">
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="block h-full rounded-2xl border-2 border-line bg-white px-4 py-3 transition-colors peer-checked:border-bruin-500 peer-checked:bg-bruin-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bruin-500 hover:border-bruin-300">
        <span className="block font-bold text-ink">{label}</span>
        <span className="mt-0.5 block text-sm text-muted">{hint}</span>
      </span>
    </label>
  );
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
  onChange,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-bold text-ink">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-bruin-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bruin-500 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  );
}

function MoneyInput({
  id,
  defaultValue,
  invalid,
  placeholder,
}: {
  id: string;
  defaultValue?: number;
  invalid?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-bold text-muted">$</span>
      <Input
        id={id}
        name={id}
        inputMode="numeric"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={cn("pl-8")}
        aria-invalid={invalid}
      />
    </div>
  );
}
