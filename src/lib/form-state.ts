/** Shape returned by server actions used with useActionState. */
export type FormState = {
  /** General error shown at the top of the form. */
  error?: string;
  /** Per-field errors, keyed by input name. */
  fieldErrors?: Record<string, string[] | undefined>;
  /** Success message. */
  message?: string;
};

export const initialFormState: FormState = {};
