import "server-only";
import type {
  Amenity,
  Inquiry,
  Listing,
  ListingImage,
  ListingInput,
  ListingStatus,
  ListingWithOwner,
  Neighborhood,
  Profile,
  PublicProfile,
  Report,
} from "@/lib/types";
import type { Tables, TablesInsert } from "@/lib/database.types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { compareListings, matchesFilters } from "@/lib/search";
import { bucketPathOf } from "@/lib/storage/photo-urls";
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

/** The listing columns the poster fills in (everything but images), as a partial row. */
function toListingColumns(input: Partial<ListingInput>): Partial<TablesInsert<"listings">> {
  const cols: Partial<TablesInsert<"listings">> = {
    title: input.title,
    description: input.description,
    neighborhood: input.neighborhood,
    location_hint: input.locationHint,
    housing_type: input.housingType,
    room_type: input.roomType,
    furnished: input.furnished,
    rent: input.rent,
    security_deposit: input.securityDeposit,
    utilities_included: input.utilitiesIncluded,
    utilities_estimate: input.utilitiesEstimate,
    available_from: input.availableFrom,
    available_to: input.availableTo,
    flexible_dates: input.flexibleDates,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    roommates: input.roommates,
    amenities: input.amenities,
    house_rules: input.houseRules,
    lease_permission: input.leasePermission,
  };
  // Leave out fields the caller didn't pass, so an update only touches what changed.
  return Object.fromEntries(Object.entries(cols).filter(([, v]) => v !== undefined));
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

    async create(ownerId, input, status) {
      const res = await db()
        .from("listings")
        .insert({ ...(toListingColumns(input) as TablesInsert<"listings">), owner_id: ownerId, status })
        .select("*")
        .single();
      const row = check(res, "listings.create");
      if (!row) throw new Error("Supabase listings.create returned no row");
      try {
        const images = await replaceImages(row.id, input.images);
        return toListing(row, images);
      } catch (err) {
        // Don't leave a listing behind without the photos the poster added.
        await db().from("listings").delete().eq("id", row.id);
        throw err;
      }
    },

    async update(id, input) {
      if (!isUuid(id)) throw new NotFoundError("Listing", id);
      const { images, ...rest } = input;
      const cols = toListingColumns(rest);
      // Always write something, so updated_at moves even when only the photos changed
      // (the listings_touch trigger sets the real value).
      const res = await db()
        .from("listings")
        .update({ ...cols, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      const row = check(res, "listings.update");
      if (!row) throw new NotFoundError("Listing", id);
      const imageRows = images ? await replaceImages(id, images) : await loadImages(id);
      return toListing(row, imageRows);
    },

    async setStatus(id, status) {
      if (!isUuid(id)) throw new NotFoundError("Listing", id);
      const res = await db()
        .from("listings")
        .update({ status })
        .eq("id", id)
        .select("*, images:listing_images(*)")
        .maybeSingle();
      const row = check(res, "listings.setStatus") as (ListingRow & { images: ImageRow[] }) | null;
      if (!row) throw new NotFoundError("Listing", id);
      return toListing(row, row.images);
    },
  };

  async function loadImages(listingId: string): Promise<ImageRow[]> {
    const res = await db().from("listing_images").select("*").eq("listing_id", listingId);
    return check(res, "listing_images.list") ?? [];
  }

  /** Swaps a listing's photos for `images`, in order (position 0 is the cover). */
  async function replaceImages(listingId: string, images: ListingInput["images"]): Promise<ImageRow[]> {
    check(await db().from("listing_images").delete().eq("listing_id", listingId), "listing_images.delete");
    if (images.length === 0) return [];
    const res = await db()
      .from("listing_images")
      .insert(images.map((img, position) => ({
          listing_id: listingId,
          url: img.url,
          storage_path: bucketPathOf(img.url),
          alt: img.alt,
          position,
        })),)
      .select("*");
    return check(res, "listing_images.insert") ?? [];
  }
}

function favoriteRepo(listings: ListingRepo): FavoriteRepo {
  const db = () => getSupabaseAdmin();
  return {
    async listListings(userId) {
      if (!isUuid(userId)) return [];
      const res = await db()
        .from("favorites")
        .select("listing_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      const ids = (check(res, "favorites.listListings") ?? []).map((r) => r.listing_id);
      if (ids.length === 0) return [];
      // Any status but draft, so "no longer available" can be shown. Most recently saved first.
      const byId = new Map(
        (await listings.list({ ids, status: "any" })).filter((l) => l.status !== "draft").map((l) => [l.id, l]),
      );
      return ids.flatMap((id) => byId.get(id) ?? []);
    },
    async listIds(userId) {
      if (!isUuid(userId)) return [];
      const res = await db().from("favorites").select("listing_id").eq("user_id", userId);
      return (check(res, "favorites.listIds") ?? []).map((r) => r.listing_id);
    },
    async add(userId, listingId) {
      if (!isUuid(listingId)) throw new NotFoundError("Listing", listingId);
      // Saving twice is fine: keep the original row (and its date).
      const upsert = await db()
        .from("favorites")
        .upsert({ user_id: userId, listing_id: listingId }, { onConflict: "user_id,listing_id", ignoreDuplicates: true });
      if (upsert.error?.code === "23503") throw new NotFoundError("Listing", listingId);
      check(upsert, "favorites.add");
      const res = await db()
        .from("favorites")
        .select("*")
        .eq("user_id", userId)
        .eq("listing_id", listingId)
        .single();
      const row = check(res, "favorites.add");
      if (!row) throw new NotFoundError("Favorite", listingId);
      return { userId: row.user_id, listingId: row.listing_id, createdAt: row.created_at };
    },
    async remove(userId, listingId) {
      if (!isUuid(userId) || !isUuid(listingId)) return;
      check(
        await db().from("favorites").delete().eq("user_id", userId).eq("listing_id", listingId),
        "favorites.remove",
      );
    },
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
    async create({ listingId, senderId, message, desiredFrom = null, desiredTo = null }) {
      if (!isUuid(listingId)) throw new NotFoundError("Listing", listingId);
      const owner = check(
        await db().from("listings").select("owner_id").eq("id", listingId).maybeSingle(),
        "inquiries.create",
      );
      if (!owner) throw new NotFoundError("Listing", listingId);
      const res = await db()
        .from("inquiries")
        .insert({
          listing_id: listingId,
          sender_id: senderId,
          // The inquiries_set_recipient trigger sets this to the listing's owner either way.
          recipient_id: owner.owner_id,
          message,
          desired_from: desiredFrom,
          desired_to: desiredTo,
        })
        .select("*")
        .single();
      const row = check(res, "inquiries.create");
      if (!row) throw new Error("Supabase inquiries.create returned no row");
      return toInquiry(row);
    },
    async listReceived(userId) {
      if (!isUuid(userId)) return [];
      const res = await db()
        .from("inquiries")
        .select("*")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false });
      return (check(res, "inquiries.listReceived") ?? []).map(toInquiry);
    },
    async countSentSince(userId, since) {
      if (!isUuid(userId)) return 0;
      const res = await db()
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", userId)
        .gte("created_at", since.toISOString());
      if (res.error) throw new Error(`Supabase inquiries.countSentSince failed: ${res.error.message}`);
      return res.count ?? 0;
    },
    async setStatus(id, status) {
      if (!isUuid(id)) throw new NotFoundError("Inquiry", id);
      const res = await db().from("inquiries").update({ status }).eq("id", id).select("*").maybeSingle();
      const row = check(res, "inquiries.setStatus");
      if (!row) throw new NotFoundError("Inquiry", id);
      return toInquiry(row);
    },
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
    async create({ listingId, reporterId, reason, details = null }) {
      if (!isUuid(listingId)) throw new NotFoundError("Listing", listingId);
      const res = await db()
        .from("reports")
        .insert({ listing_id: listingId, reporter_id: reporterId, reason, details })
        .select("*")
        .single();
      if (res.error?.code === "23503") throw new NotFoundError("Listing", listingId);
      const row = check(res, "reports.create");
      if (!row) throw new Error("Supabase reports.create returned no row");
      return toReport(row);
    },
    async resolve(id, status, adminId) {
      if (!isUuid(id)) throw new NotFoundError("Report", id);
      const res = await db()
        .from("reports")
        .update({ status, resolved_by: adminId, resolved_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      const row = check(res, "reports.resolve");
      if (!row) throw new NotFoundError("Report", id);
      return toReport(row);
    },
  };
}

export function createSupabaseStore(): DataStore {
  const listings = listingRepo();
  return {
    profiles: profileRepo(),
    listings,
    favorites: favoriteRepo(listings),
    inquiries: inquiryRepo(),
    reports: reportRepo(),
  };
}
