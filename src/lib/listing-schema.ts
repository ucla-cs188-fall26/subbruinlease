import { z } from "zod";
import { AMENITIES, NEIGHBORHOODS, type ListingInput } from "@/lib/types";
import { addDays, isValidDate } from "@/lib/search";

/* Limits shared by the form, the upload endpoint, and the server action. */
export const MAX_PHOTOS = 8;
/** What the browser may pick. Big phone photos get shrunk before upload. */
export const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;
/** What the upload endpoint accepts (after the browser shrinks it). */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Longest side of a stored photo, in pixels. */
export const PHOTO_MAX_DIMENSION = 2000;
/** Max listings a student can have open (draft, published, or unavailable) at once. */
export const MAX_OPEN_LISTINGS = 5;

export type ListingIntent = "draft" | "publish";

/** Uploaded photo URLs look like /uploads/{ownerId}/{random}.webp */
const UPLOAD_URL = /^\/uploads\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.webp$/;

/**
 * A photo URL is allowed if it's one of this user's uploads, or it was already on the
 * listing (e.g. seeded photos when editing).
 */
export function isAllowedPhotoUrl(url: string, ownerId: string, existing: readonly string[] = []) {
  if (existing.includes(url)) return true;
  return UPLOAD_URL.test(url) && url.startsWith(`/uploads/${ownerId}/`);
}

/**
 * The location hint is meant to be approximate. Reject things that look like a street
 * number ("512 Landfair") or a unit ("Apt 4", "#12").
 */
export function looksLikeExactAddress(hint: string) {
  return /(^|\s)\d{2,5}\s+[a-z]/i.test(hint) || /\b(apt|unit|suite|ste|room|rm)\.?\s*#?\s*\d/i.test(hint) || /#\s*\d/.test(hint);
}

const toInt = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}.`)
    .transform((v) => Number(v.replace(/[$,]/g, "")))
    .refine((v) => Number.isInteger(v), `Use a whole number for ${label}.`)
    .refine((v) => v >= min && v <= max, `Enter ${label} between ${min.toLocaleString()} and ${max.toLocaleString()}.`);

const optionalInt = (label: string, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v.replace(/[$,]/g, ""))))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= max), `Enter ${label} between $0 and $${max.toLocaleString()}.`);

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("1"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true" || v === "1");

const photoSchema = z.object({
  url: z.string().min(1),
  alt: z.string().trim().max(120, "Keep photo descriptions under 120 characters."),
});

/** Raw shape pulled out of FormData (see readListingForm). */
export type ListingFormRaw = Record<string, unknown>;

export function readListingForm(formData: FormData): ListingFormRaw {
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  let photos: unknown = [];
  try {
    photos = JSON.parse(str("photos") || "[]");
  } catch {
    photos = null;
  }
  return {
    title: str("title"),
    description: str("description"),
    neighborhood: str("neighborhood"),
    locationHint: str("locationHint"),
    housingType: str("housingType"),
    roomType: str("roomType"),
    furnished: str("furnished"),
    rent: str("rent"),
    securityDeposit: str("securityDeposit"),
    utilitiesIncluded: str("utilitiesIncluded"),
    utilitiesEstimate: str("utilitiesEstimate"),
    availableFrom: str("availableFrom"),
    availableTo: str("availableTo"),
    flexibleDates: str("flexibleDates"),
    bedrooms: str("bedrooms"),
    bathrooms: str("bathrooms"),
    roommates: str("roommates"),
    amenities: formData.getAll("amenities").filter((v) => typeof v === "string"),
    houseRules: str("houseRules"),
    leasePermission: str("leasePermission"),
    photos,
    confirm: str("confirm"),
  };
}

/**
 * Validation for creating/editing a listing. Drafts skip the photo and confirmation
 * requirements so students can save and come back; everything else is checked either way.
 * `today` is "YYYY-MM-DD" (passed in so tests are deterministic).
 */
export function listingSchema({
  intent,
  today,
  requireConfirm = intent === "publish",
}: {
  intent: ListingIntent;
  today: string;
  /** Edits to an already-published listing keep publish rules but skip the checkbox. */
  requireConfirm?: boolean;
}) {
  const publishing = intent === "publish";
  const latest = addDays(today, 365 * 2);

  return z
    .object({
      title: z.string().trim().min(8, "Give it a title of at least 8 characters.").max(90, "Keep the title under 90 characters."),
      description: z
        .string()
        .trim()
        .min(40, "Tell people a bit more (at least 40 characters).")
        .max(4000, "Keep the description under 4,000 characters."),
      neighborhood: z.enum(NEIGHBORHOODS, "Pick a neighborhood."),
      locationHint: z
        .string()
        .trim()
        .min(3, "Add a rough location, like “Landfair near Strathmore”.")
        .max(80, "Keep it under 80 characters.")
        .refine((v) => !looksLikeExactAddress(v), "Leave out the street number and unit. Cross streets are enough."),
      housingType: z.enum(["apartment", "house", "townhouse", "condo", "other"], "Pick a housing type."),
      roomType: z.enum(["private", "shared", "entire"], "Pick a room type."),
      furnished: checkbox,
      rent: toInt("monthly rent", 100, 10_000),
      securityDeposit: optionalInt("a deposit", 20_000),
      utilitiesIncluded: checkbox,
      utilitiesEstimate: optionalInt("a utilities estimate", 1_000),
      availableFrom: z.string().refine(isValidDate, "Pick a move-in date."),
      availableTo: z.string().refine(isValidDate, "Pick a move-out date."),
      flexibleDates: checkbox,
      bedrooms: toInt("bedrooms", 0, 10),
      bathrooms: z
        .string()
        .trim()
        .min(1, "Enter bathrooms.")
        .transform(Number)
        .refine((v) => v >= 0.5 && v <= 10 && Number.isInteger(v * 2), "Use a number like 1, 1.5, or 2."),
      roommates: toInt("roommates", 0, 12),
      amenities: z.array(z.enum(AMENITIES)).transform((a) => [...new Set(a)]),
      houseRules: z
        .string()
        .trim()
        .max(1000, "Keep house rules under 1,000 characters.")
        .transform((v) => (v === "" ? null : v)),
      leasePermission: z.enum(["allowed", "landlord_approved", "pending"], "Tell people whether subleasing is allowed."),
      photos: z
        .array(photoSchema, "Something went wrong with your photos. Try re-adding them.")
        .max(MAX_PHOTOS, `Use at most ${MAX_PHOTOS} photos.`)
        .refine((p) => !publishing || p.length > 0, "Add at least one photo before publishing."),
      confirm: checkbox.refine(
        (v) => !requireConfirm || v,
        "Please confirm before publishing.",
      ),
    })
    .superRefine((v, ctx) => {
      if (isValidDate(v.availableFrom) && isValidDate(v.availableTo)) {
        if (v.availableTo <= v.availableFrom) {
          ctx.addIssue({ code: "custom", path: ["availableTo"], message: "Move-out has to be after move-in." });
        }
        if (v.availableTo <= today) {
          ctx.addIssue({ code: "custom", path: ["availableTo"], message: "Move-out has to be in the future." });
        }
        if (v.availableFrom > latest) {
          ctx.addIssue({ code: "custom", path: ["availableFrom"], message: "Move-in must be within the next two years." });
        }
      }
    })
    .transform(({ photos, utilitiesEstimate, ...fields }) => {
      // `confirm` is only a checkbox on the form; it isn't stored.
      const { confirm, ...rest } = fields;
      void confirm;
      const input: ListingInput = {
        ...rest,
        utilitiesEstimate: rest.utilitiesIncluded ? null : utilitiesEstimate,
        images: photos.map((p, i) => ({ url: p.url, alt: p.alt || `${rest.title} – photo ${i + 1}` })),
      };
      return input;
    });
}
