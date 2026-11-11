import type {
  Amenity,
  HousingType,
  LeasePermission,
  ListingStatus,
  ReportReason,
  RoomType,
} from "@/lib/types";

export const roomTypeLabels: Record<RoomType, string> = {
  private: "Private room",
  shared: "Shared room",
  entire: "Entire place",
};

export const housingTypeLabels: Record<HousingType, string> = {
  apartment: "Apartment",
  house: "House",
  townhouse: "Townhouse",
  condo: "Condo",
  other: "Other",
};

export const amenityLabels: Record<Amenity, string> = {
  in_unit_laundry: "In-unit laundry",
  on_site_laundry: "On-site laundry",
  parking: "Parking",
  kitchen: "Kitchen access",
  wifi: "Wi-Fi",
  air_conditioning: "Air conditioning",
  dishwasher: "Dishwasher",
  gym: "Gym",
  pool: "Pool",
  balcony: "Balcony / patio",
  pets_allowed: "Pets allowed",
  wheelchair_accessible: "Wheelchair accessible",
};

export const leasePermissionLabels: Record<LeasePermission, string> = {
  allowed: "Lease allows subleasing",
  landlord_approved: "Landlord approved",
  pending: "Landlord approval pending",
};

export const listingStatusLabels: Record<ListingStatus, string> = {
  draft: "Draft",
  published: "Published",
  unavailable: "Unavailable",
  closed: "Closed",
  hidden: "Hidden by moderators",
};

export const reportReasonLabels: Record<ReportReason, string> = {
  scam: "Looks like a scam",
  misleading: "Misleading photos or details",
  not_available: "No longer available",
  no_sublease_permission: "Subleasing doesn't seem to be allowed",
  inappropriate: "Inappropriate content",
  other: "Something else",
};
