import type {
  Favorite,
  ID,
  Inquiry,
  Listing,
  ListingImage,
  ListingStatus,
  ListingWithOwner,
  Profile,
  PublicProfile,
  Report,
} from "@/lib/types";
import { NotFoundError, type DataStore, type ListingQuery } from "../store";
import { seed } from "./seed";

/**
 * In-memory DataStore backed by the fake seed data.
 * Everything is deep-copied in and out so callers can't mutate the store by accident.
 */
export function createMockStore(): DataStore {
  const db = structuredClone(seed);
  const now = () => new Date().toISOString();
  const newId = () => crypto.randomUUID();
  const copy = <T>(value: T): T => structuredClone(value);

  function toPublic(p: Profile): PublicProfile {
    return {
      id: p.id,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      gradYear: p.gradYear,
      bio: p.bio,
      emailVerified: p.emailVerified,
    };
  }

  function withOwner(listing: Listing): ListingWithOwner {
    const owner = db.profiles.find((p) => p.id === listing.ownerId);
    if (!owner) throw new NotFoundError("Profile", listing.ownerId);
    return copy({ ...listing, owner: toPublic(owner) });
  }

  function newestFirst(a: Listing, b: Listing) {
    const ka = a.publishedAt ?? a.createdAt;
    const kb = b.publishedAt ?? b.createdAt;
    return kb.localeCompare(ka);
  }

  function findListing(id: ID) {
    const listing = db.listings.find((l) => l.id === id);
    if (!listing) throw new NotFoundError("Listing", id);
    return listing;
  }

  function findProfile(id: ID) {
    const profile = db.profiles.find((p) => p.id === id);
    if (!profile) throw new NotFoundError("Profile", id);
    return profile;
  }

  function matchesStatus(status: ListingStatus, wanted: ListingQuery["status"]) {
    if (wanted === "any") return true;
    const list = Array.isArray(wanted) ? wanted : [wanted ?? "published"];
    return list.includes(status);
  }

  function makeImages(listingId: ID, images: Array<Pick<ListingImage, "url" | "alt">>) {
    return images.map((img, position) => ({ id: newId(), listingId, position, ...img }));
  }

  return {
    profiles: {
      async get(id) {
        const p = db.profiles.find((x) => x.id === id);
        return p ? copy(p) : null;
      },
      async getByEmail(email) {
        const p = db.profiles.find((x) => x.email.toLowerCase() === email.toLowerCase());
        return p ? copy(p) : null;
      },
      async create({ email, displayName }) {
        const profile: Profile = {
          id: newId(),
          email: email.toLowerCase(),
          displayName,
          avatarUrl: null,
          gradYear: null,
          bio: null,
          emailVerified: true,
          role: "student",
          status: "active",
          createdAt: now(),
        };
        db.profiles.push(profile);
        return copy(profile);
      },
      async update(id, patch) {
        const p = findProfile(id);
        Object.assign(p, patch);
        return copy(p);
      },
      async setStatus(id, status) {
        const p = findProfile(id);
        p.status = status;
        return copy(p);
      },
      async list() {
        return copy(db.profiles);
      },
    },

    listings: {
      async list(query = {}) {
        return db.listings
          .filter((l) => matchesStatus(l.status, query.status))
          .filter((l) => !query.ownerId || l.ownerId === query.ownerId)
          .filter((l) => !query.ids || query.ids.includes(l.id))
          .sort(newestFirst)
          .map(withOwner);
      },
      async get(id) {
        const l = db.listings.find((x) => x.id === id);
        return l ? withOwner(l) : null;
      },
      async create(ownerId, input, status) {
        findProfile(ownerId);
        const id = newId();
        const ts = now();
        const listing: Listing = {
          ...input,
          id,
          ownerId,
          status,
          images: makeImages(id, input.images),
          createdAt: ts,
          updatedAt: ts,
          publishedAt: status === "published" ? ts : null,
        };
        db.listings.push(listing);
        return copy(listing);
      },
      async update(id, input) {
        const l = findListing(id);
        const { images, ...rest } = input;
        Object.assign(l, rest, { updatedAt: now() });
        if (images) l.images = makeImages(id, images);
        return copy(l);
      },
      async setStatus(id, status) {
        const l = findListing(id);
        l.status = status;
        l.updatedAt = now();
        if (status === "published" && !l.publishedAt) l.publishedAt = l.updatedAt;
        return copy(l);
      },
    },

    favorites: {
      async listListings(userId) {
        const ids = db.favorites
          .filter((f) => f.userId === userId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((f) => f.listingId);
        return ids
          .map((id) => db.listings.find((l) => l.id === id))
          .filter((l): l is Listing => Boolean(l) && l!.status !== "draft")
          .map(withOwner);
      },
      async listIds(userId) {
        return db.favorites.filter((f) => f.userId === userId).map((f) => f.listingId);
      },
      async add(userId, listingId) {
        findListing(listingId);
        const existing = db.favorites.find((f) => f.userId === userId && f.listingId === listingId);
        if (existing) return copy(existing);
        const fav: Favorite = { userId, listingId, createdAt: now() };
        db.favorites.push(fav);
        return copy(fav);
      },
      async remove(userId, listingId) {
        db.favorites = db.favorites.filter(
          (f) => !(f.userId === userId && f.listingId === listingId),
        );
      },
    },

    inquiries: {
      async create({ listingId, senderId, message, desiredFrom = null, desiredTo = null }) {
        const listing = findListing(listingId);
        const inquiry: Inquiry = {
          id: newId(),
          listingId,
          senderId,
          recipientId: listing.ownerId,
          message,
          desiredFrom,
          desiredTo,
          status: "sent",
          createdAt: now(),
        };
        db.inquiries.push(inquiry);
        return copy(inquiry);
      },
      async listSent(userId) {
        return copy(
          db.inquiries
            .filter((i) => i.senderId === userId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
      },
      async listReceived(userId) {
        return copy(
          db.inquiries
            .filter((i) => i.recipientId === userId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
      },
      async countSentSince(userId, since) {
        const cutoff = since.toISOString();
        return db.inquiries.filter((i) => i.senderId === userId && i.createdAt >= cutoff).length;
      },
      async setStatus(id, status) {
        const i = db.inquiries.find((x) => x.id === id);
        if (!i) throw new NotFoundError("Inquiry", id);
        i.status = status;
        return copy(i);
      },
    },

    reports: {
      async create({ listingId, reporterId, reason, details = null }) {
        findListing(listingId);
        const report: Report = {
          id: newId(),
          listingId,
          reporterId,
          reason,
          details,
          status: "open",
          resolvedBy: null,
          resolvedAt: null,
          createdAt: now(),
        };
        db.reports.push(report);
        return copy(report);
      },
      async list(query = {}) {
        return copy(
          db.reports
            .filter((r) => !query.status || r.status === query.status)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
      },
      async resolve(id, status, adminId) {
        const r = db.reports.find((x) => x.id === id);
        if (!r) throw new NotFoundError("Report", id);
        r.status = status;
        r.resolvedBy = adminId;
        r.resolvedAt = now();
        return copy(r);
      },
    },
  };
}
