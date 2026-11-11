/**
 * Domain types for subBruinLease.
 *
 * These are the source of truth for the data model. The database (Supabase/Postgres)
 * should mirror them — see docs/data-model.md for the table-by-table version.
 *
 * Conventions:
 * - IDs are strings (UUIDs in the real database).
 * - Calendar dates (availability) are "YYYY-MM-DD" strings, with no time zone.
 * - Timestamps are ISO 8601 strings, e.g. "2026-11-11T18:30:00.000Z".
 * - Money is whole US dollars per month.
 */

export type ID = string;
/** "YYYY-MM-DD" */
export type DateString = string;
/** ISO 8601 timestamp */
export type Timestamp = string;

/* ------------------------------------------------------------------ */
/* Profiles                                                            */
/* ------------------------------------------------------------------ */

export type UserRole = "student" | "admin";
export type AccountStatus = "active" | "suspended";

export interface Profile {
  id: ID;
  /** Verified @ucla.edu (or @g.ucla.edu) address. Never shown publicly. */
  email: string;
  displayName: string;
  avatarUrl: string | null;
  /** e.g. 2027 */
  gradYear: number | null;
  bio: string | null;
  /** True once the user has proven they control `email`. */
  emailVerified: boolean;
  role: UserRole;
  status: AccountStatus;
  createdAt: Timestamp;
}

/** What other students may see about a user. */
export type PublicProfile = Pick<
  Profile,
  "id" | "displayName" | "avatarUrl" | "gradYear" | "bio" | "emailVerified"
>;

/* ------------------------------------------------------------------ */
/* Listings                                                            */
/* ------------------------------------------------------------------ */

export const NEIGHBORHOODS = [
  "North Village",
  "Westwood Village",
  "South Westwood",
  "Westwood (Wilshire Corridor)",
  "Brentwood",
  "Sawtelle",
  "Palms",
  "Santa Monica",
  "Culver City",
  "Other",
] as const;
export type Neighborhood = (typeof NEIGHBORHOODS)[number];

export type HousingType = "apartment" | "house" | "townhouse" | "condo" | "other";

/** private = your own bedroom; shared = share a bedroom; entire = the whole unit */
export type RoomType = "private" | "shared" | "entire";

export const AMENITIES = [
  "in_unit_laundry",
  "on_site_laundry",
  "parking",
  "kitchen",
  "wifi",
  "air_conditioning",
  "dishwasher",
  "gym",
  "pool",
  "balcony",
  "pets_allowed",
  "wheelchair_accessible",
] as const;
export type Amenity = (typeof AMENITIES)[number];

/**
 * Whether the lease allows subleasing.
 * - allowed: the lease explicitly allows it
 * - landlord_approved: written approval from the landlord/property manager was obtained
 * - pending: approval has been requested but not yet received
 */
export type LeasePermission = "allowed" | "landlord_approved" | "pending";

/**
 * Lifecycle:
 *   draft ──publish──▶ published ◀──▶ unavailable
 *                         │
 *                         └──close──▶ closed
 * `hidden` is set only by admins (moderation). Only `published` shows in search.
 */
export type ListingStatus = "draft" | "published" | "unavailable" | "closed" | "hidden";

export interface ListingImage {
  id: ID;
  listingId: ID;
  /** Public URL (fake data) or storage path (Supabase Storage). */
  url: string;
  alt: string;
  /** 0-based display order; 0 is the cover photo. */
  position: number;
}

export interface Listing {
  id: ID;
  ownerId: ID;
  status: ListingStatus;

  // Basics
  title: string;
  description: string;
  neighborhood: Neighborhood;
  /** Approximate only — e.g. "Landfair Ave near Strathmore". Never a unit number. */
  locationHint: string;
  housingType: HousingType;
  roomType: RoomType;
  furnished: boolean;

  // Pricing & availability
  rent: number;
  securityDeposit: number | null;
  utilitiesIncluded: boolean;
  /** Monthly estimate when utilities are not included. */
  utilitiesEstimate: number | null;
  availableFrom: DateString;
  availableTo: DateString;
  /** Poster is open to adjusting dates a bit. */
  flexibleDates: boolean;

  // Apartment details
  bedrooms: number;
  bathrooms: number;
  /** Other people who will be living in the unit during the sublease. */
  roommates: number;
  amenities: Amenity[];
  houseRules: string | null;

  // Lease
  leasePermission: LeasePermission;

  images: ListingImage[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt: Timestamp | null;
}

/** A listing joined with its owner's public profile, for display. */
export interface ListingWithOwner extends Listing {
  owner: PublicProfile;
}

/** Fields a student fills in when creating/editing a listing. */
export type ListingInput = Omit<
  Listing,
  "id" | "ownerId" | "status" | "images" | "createdAt" | "updatedAt" | "publishedAt"
> & {
  images: Array<Pick<ListingImage, "url" | "alt">>;
};

/* ------------------------------------------------------------------ */
/* Favorites                                                           */
/* ------------------------------------------------------------------ */

export interface Favorite {
  userId: ID;
  listingId: ID;
  createdAt: Timestamp;
}

/* ------------------------------------------------------------------ */
/* Inquiries (contacting a poster)                                     */
/* ------------------------------------------------------------------ */

export type InquiryStatus = "sent" | "read" | "archived";

export interface Inquiry {
  id: ID;
  listingId: ID;
  senderId: ID;
  /** Listing owner at the time the inquiry was sent. */
  recipientId: ID;
  message: string;
  /** Dates the sender is interested in, if they gave them. */
  desiredFrom: DateString | null;
  desiredTo: DateString | null;
  status: InquiryStatus;
  createdAt: Timestamp;
}

/* ------------------------------------------------------------------ */
/* Reports (moderation)                                                */
/* ------------------------------------------------------------------ */

export type ReportReason =
  | "scam"
  | "misleading"
  | "not_available"
  | "no_sublease_permission"
  | "inappropriate"
  | "other";

export type ReportStatus = "open" | "resolved" | "dismissed";

export interface Report {
  id: ID;
  listingId: ID;
  reporterId: ID;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  /** Admin who resolved/dismissed it. */
  resolvedBy: ID | null;
  resolvedAt: Timestamp | null;
  createdAt: Timestamp;
}
