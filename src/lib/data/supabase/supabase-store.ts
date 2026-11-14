import "server-only";
import type {
  Amenity,
  Inquiry,
  Listing,
  ListingImage,
  ListingStatus,
  ListingWithOwner,
  Neighborhood,
  Profile,
  PublicProfile,
  Report,
} from "@/lib/types";
import type { Tables } from "@/lib/database.types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { compareListings, matchesFilters } from "@/lib/search";
import {
  NotFoundError,
  type DataStore,
  type FavoriteRepo,
  type InquiryRepo,
  type ListingQuery,
  type ListingRepo,
  type ProfileRepo,
  type ReportRepo,
} from "../store";

/**
 * DataStore backed by Supabase. Uses the service role (see src/lib/supabase/admin.ts), so
 * Row Level Security doesn't apply here: callers check permissions, as with the mock store.
 * Maps snake_case rows to the camelCase types in src/lib/types.ts.
 */

type ProfileRow = Tables<"profiles">;

export function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    gradYear: row.grad_year,
    bio: row.bio,
    emailVerified: row.email_verified,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  };
}

type ListingRow = Tables<"listings">;
type ImageRow = Tables<"listing_images">;
type PublicProfileRow = Pick<
  ProfileRow,
  "id" | "display_name" | "avatar_url" | "grad_year" | "bio" | "email_verified"
>;
type ListingJoinRow = ListingRow & { owner: PublicProfileRow | null; images: ImageRow[] };

/** A listing with its owner's public fields and its photos, in one query. */
const LISTING_SELECT =
  "*, owner:profiles!listings_owner_id_fkey(id, display_name, avatar_url, grad_year, bio, email_verified), images:listing_images(*)";

function toPublicProfile(row: PublicProfileRow): PublicProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    gradYear: row.grad_year,
    bio: row.bio,
    emailVerified: row.email_verified,
  };
}

function toImage(row: ImageRow): ListingImage {
  return { id: row.id, listingId: row.listing_id, url: row.url, alt: row.alt, position: row.position };
}

export function toListing(row: ListingRow, images: ImageRow[] = []): Listing {
  return {
    id: row.id,
    ownerId: row.owner_id,
    status: row.status,
    title: row.title,
    description: row.description,
    neighborhood: row.neighborhood as Neighborhood,
    locationHint: row.location_hint,
    housingType: row.housing_type,
    roomType: row.room_type,
    furnished: row.furnished,
    rent: row.rent,
    securityDeposit: row.security_deposit,
    utilitiesIncluded: row.utilities_included,
    utilitiesEstimate: row.utilities_estimate,
    availableFrom: row.available_from,
    availableTo: row.available_to,
    flexibleDates: row.flexible_dates,
    bedrooms: row.bedrooms,
    bathrooms: Number(row.bathrooms),
    roommates: row.roommates,
    amenities: row.amenities as Amenity[],
    houseRules: row.house_rules,
    leasePermission: row.lease_permission,
    images: [...images].sort((a, b) => a.position - b.position).map(toImage),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function toListingWithOwner(row: ListingJoinRow): ListingWithOwner {
  if (!row.owner) throw new NotFoundError("Profile", row.owner_id);
  return { ...toListing(row, row.images), owner: toPublicProfile(row.owner) };
}

export function toInquiry(row: Tables<"inquiries">): Inquiry {
  return {
    id: row.id,
    listingId: row.listing_id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    message: row.message,
    desiredFrom: row.desired_from,
    desiredTo: row.desired_to,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function toReport(row: Tables<"reports">): Report {
  return {
    id: row.id,
    listingId: row.listing_id,
    reporterId: row.reporter_id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

/** Newest first, by publishedAt then createdAt (same as the mock store). */
function newestFirst(a: Listing, b: Listing) {
  return (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Ids come from URLs; Postgres errors on a malformed uuid, so treat those as "not found". */
const isUuid = (id: string) => UUID.test(id);

/** Throws with the Supabase error message, so failures show up in server logs. */
function check<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Supabase ${what} failed: ${result.error.message}`);
  return result.data;
}

function profileRepo(): ProfileRepo {
  const db = () => getSupabaseAdmin();

  return {
    async get(id) {
      const res = await db().from("profiles").select("*").eq("id", id).maybeSingle();
      const row = check(res, "profiles.get");
      return row ? toProfile(row) : null;
    },
    async getByEmail(email) {
      const res = await db()
        .from("profiles")
        .select("*")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();
      const row = check(res, "profiles.getByEmail");
      return row ? toProfile(row) : null;
    },
    async create() {
      // With Supabase, the profile row is created by the on_auth_user_created trigger
      // when Supabase Auth creates the user. Nothing in the Supabase sign-in flow calls this.
      throw new Error("profiles.create isn't used with Supabase: the auth trigger creates profiles.");
    },
    async update(id, patch) {
      const res = await db()
        .from("profiles")
        .update({
          ...(patch.displayName !== undefined && { display_name: patch.displayName }),
          ...(patch.avatarUrl !== undefined && { avatar_url: patch.avatarUrl }),
          ...(patch.gradYear !== undefined && { grad_year: patch.gradYear }),
          ...(patch.bio !== undefined && { bio: patch.bio }),
        })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      const row = check(res, "profiles.update");
      if (!row) throw new NotFoundError("Profile", id);
      return toProfile(row);
    },
    async setStatus(id, status) {
      const res = await db().from("profiles").update({ status }).eq("id", id).select("*").maybeSingle();
      const row = check(res, "profiles.setStatus");
      if (!row) throw new NotFoundError("Profile", id);
      return toProfile(row);
    },
    async list() {
      const res = await db().from("profiles").select("*").order("created_at", { ascending: false });
      return (check(res, "profiles.list") ?? []).map(toProfile);
    },
  };
}

function listingRepo(): ListingRepo {
  const db = () => getSupabaseAdmin();
  const select = () => db().from("listings").select(LISTING_SELECT);

  function statusList(wanted: ListingQuery["status"]): ListingStatus[] | null {
    if (wanted === "any") return null;
    return Array.isArray(wanted) ? wanted : [wanted ?? "published"];
  }

  return {
    async list(query = {}) {
      let q = select();
      const statuses = statusList(query.status);
      if (statuses) q = q.in("status", statuses);
      if (query.ownerId) {
        if (!isUuid(query.ownerId)) return [];
        q = q.eq("owner_id", query.ownerId);
      }
      if (query.ids) {
        const ids = query.ids.filter(isUuid);
        if (ids.length === 0) return [];
        q = q.in("id", ids);
      }
      const rows = check(await q, "listings.list") as ListingJoinRow[] | null;
      return (rows ?? []).map(toListingWithOwner).sort(newestFirst);
    },

    async search(filters) {
      // The database narrows by the simple filters; the shared rules in src/lib/search.ts
      // then apply text matching, flexible dates and sorting exactly as in mock mode.
      let q = select().eq("status", "published");
      if (filters.maxRent !== null) q = q.lte("rent", filters.maxRent);
      if (filters.roomTypes.length > 0) q = q.in("room_type", filters.roomTypes);
      if (filters.furnished) q = q.eq("furnished", true);
      if (filters.neighborhood !== null) q = q.eq("neighborhood", filters.neighborhood);
      const rows = check(await q, "listings.search") as ListingJoinRow[] | null;
      return (rows ?? [])
        .map(toListingWithOwner)
        .filter((l) => matchesFilters(l, filters))
        .sort(compareListings(filters.sort));
    },

    async get(id) {
      if (!isUuid(id)) return null;
      const row = check(await select().eq("id", id).maybeSingle(), "listings.get") as ListingJoinRow | null;
      return row ? toListingWithOwner(row) : null;
    },

    create: notYet("listings.create"),
    update: notYet("listings.update"),
    setStatus: notYet("listings.setStatus"),
  };
}

/** Methods not connected to Supabase yet throw a clear error when called. */
const notYet = (name: string) => () => {
  throw new Error(`${name} isn't connected to Supabase yet.`);
};

function favoriteRepo(): FavoriteRepo {
  const db = () => getSupabaseAdmin();
  return {
    async listIds(userId) {
      if (!isUuid(userId)) return [];
      const res = await db().from("favorites").select("listing_id").eq("user_id", userId);
      return (check(res, "favorites.listIds") ?? []).map((r) => r.listing_id);
    },
    listListings: notYet("favorites.listListings"),
    add: notYet("favorites.add"),
    remove: notYet("favorites.remove"),
  };
}

function inquiryRepo(): InquiryRepo {
  const db = () => getSupabaseAdmin();
  return {
    async listSent(userId) {
      if (!isUuid(userId)) return [];
      const res = await db()
        .from("inquiries")
        .select("*")
        .eq("sender_id", userId)
        .order("created_at", { ascending: false });
      return (check(res, "inquiries.listSent") ?? []).map(toInquiry);
    },
    create: notYet("inquiries.create"),
    listReceived: notYet("inquiries.listReceived"),
    countSentSince: notYet("inquiries.countSentSince"),
    setStatus: notYet("inquiries.setStatus"),
  };
}

function reportRepo(): ReportRepo {
  const db = () => getSupabaseAdmin();
  return {
    async list(query = {}) {
      let q = db().from("reports").select("*");
      if (query.status) q = q.eq("status", query.status);
      if (query.reporterId) {
        if (!isUuid(query.reporterId)) return [];
        q = q.eq("reporter_id", query.reporterId);
      }
      if (query.listingId) {
        if (!isUuid(query.listingId)) return [];
        q = q.eq("listing_id", query.listingId);
      }
      const res = await q.order("created_at", { ascending: false });
      return (check(res, "reports.list") ?? []).map(toReport);
    },
    create: notYet("reports.create"),
    resolve: notYet("reports.resolve"),
  };
}

export function createSupabaseStore(): DataStore {
  return {
    profiles: profileRepo(),
    listings: listingRepo(),
    favorites: favoriteRepo(),
    inquiries: inquiryRepo(),
    reports: reportRepo(),
  };
}
