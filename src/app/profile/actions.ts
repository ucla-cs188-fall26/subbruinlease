"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDataStore } from "@/lib/data";
import { requireUser } from "@/lib/auth/current-user";
import { safeNextPath } from "@/lib/auth/email";
import type { FormState } from "@/lib/form-state";

const thisYear = new Date().getFullYear();

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters.")
    .max(40, "Keep it under 40 characters."),
  gradYear: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine(
      (v) => v === null || (Number.isInteger(v) && v >= thisYear - 6 && v <= thisYear + 8),
      "Pick a valid graduation year.",
    ),
  bio: z
    .string()
    .trim()
    .max(300, "Keep your bio under 300 characters.")
    .transform((v) => (v === "" ? null : v)),
});

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/profile");

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    gradYear: formData.get("gradYear") ?? "",
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  await getDataStore().profiles.update(user.id, parsed.data);

  // Re-render shared UI too (the header shows the display name).
  refresh();

  // During first-time setup, continue to wherever they were headed.
  if (formData.get("welcome") === "1") {
    redirect(safeNextPath(formData.get("next")));
  }

  return { message: "Profile saved." };
}
