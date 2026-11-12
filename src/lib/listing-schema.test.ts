import { describe, expect, it } from "vitest";
import {
  isAllowedPhotoUrl,
  listingSchema,
  looksLikeExactAddress,
  readListingForm,
  type ListingIntent,
} from "./listing-schema";

const TODAY = "2026-11-12";

function form(overrides: Record<string, string | string[]> = {}) {
  const base: Record<string, string | string[]> = {
    title: "Sunny room near campus",
    description: "A bright private room in a quiet three-bedroom apartment, five minutes from campus.",
    neighborhood: "North Village",
    locationHint: "Landfair near Strathmore",
    housingType: "apartment",
    roomType: "private",
    furnished: "on",
    rent: "1,250",
    securityDeposit: "",
    utilitiesIncluded: "",
    utilitiesEstimate: "60",
    availableFrom: "2027-06-15",
    availableTo: "2027-09-10",
    bedrooms: "3",
    bathrooms: "1.5",
    roommates: "2",
    amenities: ["wifi", "kitchen", "wifi"],
    houseRules: "",
    leasePermission: "allowed",
    photos: JSON.stringify([{ url: "/uploads/u_1/abc.webp", alt: "" }]),
    confirm: "on",
    ...overrides,
  };
  const fd = new FormData();
  for (const [k, v] of Object.entries(base)) {
    for (const item of Array.isArray(v) ? v : [v]) fd.append(k, item);
  }
  return readListingForm(fd);
}

const parse = (raw: ReturnType<typeof form>, intent: ListingIntent = "publish") =>
  listingSchema({ intent, today: TODAY }).safeParse(raw);

const errorsOf = (raw: ReturnType<typeof form>, intent: ListingIntent = "publish") => {
  const r = parse(raw, intent);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]));
};

describe("listingSchema", () => {
  it("accepts a complete listing and normalizes values", () => {
    const r = parse(form());
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.rent).toBe(1250);
    expect(r.data.bathrooms).toBe(1.5);
    expect(r.data.furnished).toBe(true);
    expect(r.data.flexibleDates).toBe(false);
    expect(r.data.securityDeposit).toBeNull();
    expect(r.data.houseRules).toBeNull();
    expect(r.data.amenities).toEqual(["wifi", "kitchen"]);
    expect(r.data.images).toEqual([{ url: "/uploads/u_1/abc.webp", alt: "Sunny room near campus – photo 1" }]);
    expect(r.data).not.toHaveProperty("confirm");
  });

  it("drops the utilities estimate when utilities are included", () => {
    const r = parse(form({ utilitiesIncluded: "on" }));
    expect(r.success && r.data.utilitiesEstimate).toBeNull();
  });

  it("requires photos and confirmation to publish, but not for drafts", () => {
    const raw = form({ photos: "[]", confirm: "" });
    expect(Object.keys(errorsOf(raw, "publish")).sort()).toEqual(["confirm", "photos"]);
    expect(parse(raw, "draft").success).toBe(true);
  });

  it("checks dates", () => {
    expect(errorsOf(form({ availableTo: "2027-06-01" }))).toHaveProperty("availableTo", "Move-out has to be after move-in.");
    expect(errorsOf(form({ availableFrom: "2026-10-01", availableTo: "2026-11-01" }))).toHaveProperty(
      "availableTo",
      "Move-out has to be in the future.",
    );
    expect(errorsOf(form({ availableFrom: "2029-01-01", availableTo: "2029-03-01" }))).toHaveProperty("availableFrom");
    expect(errorsOf(form({ availableFrom: "2027-02-30" }))).toHaveProperty("availableFrom");
  });

  it("rejects bad numbers and unknown options", () => {
    const e = errorsOf(
      form({ rent: "12.5", bathrooms: "1.25", bedrooms: "-1", neighborhood: "Narnia", amenities: ["jacuzzi"] }),
    );
    expect(Object.keys(e)).toEqual(
      expect.arrayContaining(["rent", "bathrooms", "bedrooms", "neighborhood", "amenities.0"]),
    );
  });

  it("caps photos at 8 and handles a broken photos field", () => {
    const nine = JSON.stringify(Array.from({ length: 9 }, (_, i) => ({ url: `/uploads/u_1/p${i}.webp`, alt: "" })));
    expect(errorsOf(form({ photos: nine }))).toHaveProperty("photos");
    expect(errorsOf(form({ photos: "{not json" }))).toHaveProperty("photos");
  });
});

describe("looksLikeExactAddress", () => {
  it.each(["512 Landfair Ave", "Landfair Apt 4", "Gayley unit 12", "Kelton #3", "Midvale, Rm. 2"])(
    "flags %s",
    (hint) => expect(looksLikeExactAddress(hint)).toBe(true),
  );
  it.each(["Landfair near Strathmore", "11th St and Wilshire", "Gayley & Strathmore", "Near Sawtelle Japantown"])(
    "allows %s",
    (hint) => expect(looksLikeExactAddress(hint)).toBe(false),
  );
});

describe("isAllowedPhotoUrl", () => {
  it("only allows the user's own uploads or photos already on the listing", () => {
    expect(isAllowedPhotoUrl("/uploads/u_1/abc.webp", "u_1")).toBe(true);
    expect(isAllowedPhotoUrl("/uploads/u_2/abc.webp", "u_1")).toBe(false);
    expect(isAllowedPhotoUrl("/uploads/u_1/../u_2/abc.webp", "u_1")).toBe(false);
    expect(isAllowedPhotoUrl("https://evil.example/x.jpg", "u_1")).toBe(false);
    expect(isAllowedPhotoUrl("https://images.unsplash.com/photo-1", "u_1", ["https://images.unsplash.com/photo-1"])).toBe(true);
  });
});
