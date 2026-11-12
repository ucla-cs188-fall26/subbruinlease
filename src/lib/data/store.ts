import type {
  AccountStatus,
  Favorite,
  ID,
  Inquiry,
  InquiryStatus,
  Listing,
  ListingInput,
  ListingStatus,
  ListingWithOwner,
  Profile,
  Report,
  ReportReason,
  ReportStatus,
} from "@/lib/types";
import type { ListingFilters } from "@/lib/search";

/**
 * The one interface the app uses to read and write data.
 *
 * Pages and server actions call `getDataStore()` (see ./index.ts) and never talk to a
 * database directly. Today it's backed by in-memory fake data; later a Supabase
 * implementation of this same interface gets swapped in.
 *
 * All methods are async so the swap doesn't change any calling code.
 * Permission checks (e.g. "only the owner can edit") happen in the calling server
 * code; the database will enforce them again with Row Level Security.
 */
export interface DataStore {
  profiles: ProfileRepo;
  listings: ListingRepo;
  favorites: FavoriteRepo;
  inquiries: InquiryRepo;
  reports: ReportRepo;
}

export type ProfileUpdate = Partial<Pick<Profile, "displayName" | "avatarUrl" | "gradYear" | "bio">>;

export interface ProfileRepo {
  get(id: ID): Promise<Profile | null>;
  getByEmail(email: string): Promise<Profile | null>;
  /** Called the first time a verified email signs in. */
  create(input: { email: string; displayName: string }): Promise<Profile>;
  update(id: ID, patch: ProfileUpdate): Promise<Profile>;
  setStatus(id: ID, status: AccountStatus): Promise<Profile>;
  list(): Promise<Profile[]>;
}

export interface ListingQuery {
  /** Defaults to "published". Pass "any" to skip the status filter. */
  status?: ListingStatus | ListingStatus[] | "any";
  ownerId?: ID;
  ids?: ID[];
}

export interface ListingRepo {
  /** Newest first (by publishedAt, then createdAt). */
  list(query?: ListingQuery): Promise<ListingWithOwner[]>;
  /** Explore page search. Published listings only. Rules live in src/lib/search.ts. */
  search(filters: ListingFilters): Promise<ListingWithOwner[]>;
  get(id: ID): Promise<ListingWithOwner | null>;
  create(ownerId: ID, input: ListingInput, status: "draft" | "published"): Promise<Listing>;
  update(id: ID, input: Partial<ListingInput>): Promise<Listing>;
  setStatus(id: ID, status: ListingStatus): Promise<Listing>;
}

export interface FavoriteRepo {
  /** Saved listings in any status, so "no longer available" can be shown. */
  listListings(userId: ID): Promise<ListingWithOwner[]>;
  listIds(userId: ID): Promise<ID[]>;
  add(userId: ID, listingId: ID): Promise<Favorite>;
  remove(userId: ID, listingId: ID): Promise<void>;
}

export interface InquiryRepo {
  create(input: {
    listingId: ID;
    senderId: ID;
    message: string;
    desiredFrom?: string | null;
    desiredTo?: string | null;
  }): Promise<Inquiry>;
  listSent(userId: ID): Promise<Inquiry[]>;
  listReceived(userId: ID): Promise<Inquiry[]>;
  /** Used for rate limiting. */
  countSentSince(userId: ID, since: Date): Promise<number>;
  setStatus(id: ID, status: InquiryStatus): Promise<Inquiry>;
}

export interface ReportRepo {
  create(input: {
    listingId: ID;
    reporterId: ID;
    reason: ReportReason;
    details?: string | null;
  }): Promise<Report>;
  list(query?: { status?: ReportStatus }): Promise<Report[]>;
  resolve(id: ID, status: Exclude<ReportStatus, "open">, adminId: ID): Promise<Report>;
}

export class NotFoundError extends Error {
  constructor(what: string, id: string) {
    super(`${what} not found: ${id}`);
    this.name = "NotFoundError";
  }
}
