/**
 * DEV FIXTURES — DO NOT TREAT AS REAL DATA.
 *
 * The fixtures in this file are deterministic, clearly-labelled development
 * data used to exercise the UI when no backend is connected. None of the
 * properties, rooms, bookings, payments, verifications, or reviews below
 * represent real listings, partners, transactions, or endorsements.
 *
 * Replace via the production adapter documented in /docs/integration-contracts.md.
 */

import type {
  University,
  Neighbourhood,
  Property,
  Floor,
  RentableUnit,
  Booking,
  Payment,
  Payout,
  AppNotification,
  SupportTicket,
  SavedProperty,
  Facility,
  PropertyImage,
  AdditionalCharge,
} from "@/lib/types";

/* ----------------------------------------------------------------- Helpers */

function img(url: string, alt: string, opts: Partial<PropertyImage> = {}): PropertyImage {
  return {
    id: `img_${Math.random().toString(36).slice(2, 9)}`,
    url,
    altText: alt,
    isVerified: opts.isVerified ?? false,
    caption: opts.caption ?? null,
    position: opts.position ?? 0,
  };
}

const now = Date.now();
const days = (n: number) => new Date(now + n * 86400000).toISOString();
const daysAgo = (n: number) => new Date(now - n * 86400000).toISOString();

/** Common Nigerian PropTech imagery — these are ILLUSTRATIVE placeholders only. */
const PHOTOS = {
  exteriorA: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=70&auto=format&fit=crop",
  exteriorB: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=70&auto=format&fit=crop",
  roomA: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=70&auto=format&fit=crop",
  roomB: "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=70&auto=format&fit=crop",
  roomC: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200&q=70&auto=format&fit=crop",
  roomD: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=70&auto=format&fit=crop",
  kitchen: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=70&auto=format&fit=crop",
  bathroom: "https://images.unsplash.com/photo-1620626011761-996317b8d101?w=1200&q=70&auto=format&fit=crop",
  common: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=70&auto=format&fit=crop",
  hostel: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200&q=70&auto=format&fit=crop",
};

/* ------------------------------------------------------------- Universities */

export const universities: University[] = [
  {
    id: "uni_unilag",
    slug: "university-of-lagos",
    name: "University of Lagos",
    shortName: "UNILAG",
    city: "Lagos",
    state: "Lagos",
    latitude: 6.5158,
    longitude: 3.3898,
    description:
      "The University of the First Choice and the Nation's Pride. UNILAG's Akoka campus is surrounded by a vibrant student accommodation market spanning Akoka, Yaba, Bariga and Somolu.",
    totalListings: 184,
    popularNeighbourhoods: ["Akoka", "Bariga", "Yaba", "Somolu"],
  },
  {
    id: "uni_ui",
    slug: "university-of-ibadan",
    name: "University of Ibadan",
    shortName: "UI",
    city: "Ibadan",
    state: "Oyo",
    description:
      "Nigeria's oldest university, with a mature off-campus housing market in Agbowo, Bodija and Bashorun.",
    totalListings: 96,
    popularNeighbourhoods: ["Agbowo", "Bodija", "Bashorun"],
  },
  {
    id: "uni_oau",
    slug: "obafemi-awolowo-university",
    name: "Obafemi Awolowo University",
    shortName: "OAU",
    city: "Ile-Ife",
    state: "Osun",
    description:
      "A scenic campus whose off-campus accommodation clusters around Mayfair, Ede Road and Sabo.",
    totalListings: 72,
    popularNeighbourhoods: ["Mayfair", "Sabo", "Ede Road"],
  },
  {
    id: "uni_uniben",
    slug: "university-of-benin",
    name: "University of Benin",
    shortName: "UNIBEN",
    city: "Benin City",
    state: "Edo",
    description:
      "UNIBEN's two campuses draw students to Ugbowo, Ekenwan and BDPA for off-campus living.",
    totalListings: 64,
    popularNeighbourhoods: ["Ugbowo", "BDPA", "Ekenwan"],
  },
  {
    id: "uni_abu",
    slug: "ahmadu-bello-university",
    name: "Ahmadu Bello University",
    shortName: "ABU",
    city: "Zaria",
    state: "Kaduna",
    description:
      "ABU's Samaru campus anchors a busy housing market in Samaru, Palladan and Gyallesu.",
    totalListings: 58,
    popularNeighbourhoods: ["Samaru", "Palladan", "Gyallesu"],
  },
  {
    id: "uni_unn",
    slug: "university-of-nigeria-nsukka",
    name: "University of Nigeria, Nsukka",
    shortName: "UNN",
    city: "Nsukka",
    state: "Enugu",
    description:
      "UNN's Lions' campus has off-campus accommodation spread across Nsukka town and Obukpa.",
    totalListings: 41,
    popularNeighbourhoods: ["Nsukka Town", "Obukpa", "Odenigwe"],
  },
];

export const neighbourhoods: Neighbourhood[] = [
  {
    id: "nbg_akoka",
    slug: "akoka",
    name: "Akoka",
    city: "Lagos",
    state: "Lagos",
    universityId: "uni_unilag",
    averageAnnualRentKobo: 65000000,
    walkingMinutesToCampus: 8,
    totalListings: 84,
    imageUrl: PHOTOS.hostel,
  },
  {
    id: "nbg_bariga",
    slug: "bariga",
    name: "Bariga",
    city: "Lagos",
    state: "Lagos",
    universityId: "uni_unilag",
    averageAnnualRentKobo: 48000000,
    walkingMinutesToCampus: 18,
    totalListings: 36,
    imageUrl: PHOTOS.exteriorB,
  },
  {
    id: "nbg_yaba",
    slug: "yaba",
    name: "Yaba",
    city: "Lagos",
    state: "Lagos",
    universityId: "uni_unilag",
    averageAnnualRentKobo: 85000000,
    walkingMinutesToCampus: 22,
    totalListings: 42,
    imageUrl: PHOTOS.common,
  },
  {
    id: "nbg_somolu",
    slug: "somolu",
    name: "Somolu",
    city: "Lagos",
    state: "Lagos",
    universityId: "uni_unilag",
    averageAnnualRentKobo: 42000000,
    walkingMinutesToCampus: 25,
    totalListings: 22,
    imageUrl: PHOTOS.exteriorA,
  },
];

/* ---------------------------------------------------------------- Properties */

const baseFacilities: Facility[] = [
  "wifi",
  "power_backup",
  "water_borehole",
  "cctv",
  "security_guard",
  "parking",
];

export const properties: Property[] = [
  {
    id: "prop_akoka_heights",
    slug: "akoka-heights-hostel",
    landlordId: "dev_landlord_1",
    managerIds: ["dev_manager_1"],
    agentIds: ["dev_agent_1"],
    name: "Akoka Heights Hostel",
    description:
      "A purpose-built student hostel a short walk from the UNILAG second gate. Akoka Heights offers 24-hour power, dedicated security, and a calm study environment — ideal for final-year students who need to focus. All common areas are cleaned daily and the on-site manager lives in the building.",
    type: "hostel_block",
    status: "verified",
    verificationStatus: "approved",
    city: "Lagos",
    state: "Lagos",
    neighbourhoodId: "nbg_akoka",
    universityId: "uni_unilag",
    publicAddressLine: "St. Finbarr's College Road, Akoka",
    privateAddressLine: "14 St. Finbarr's College Road, Akoka, Yaba, Lagos",
    latitude: 6.5185,
    longitude: 3.3912,
    facilities: baseFacilities,
    rules: [
      { id: "r1", label: "No loud music after 10pm", category: "quiet_hours" },
      { id: "r2", label: "Visitors allowed 9am–8pm only", category: "visitors" },
      { id: "r3", label: "No smoking indoors", category: "smoking" },
      { id: "r4", label: "Annual rent payable in two instalments", category: "payment" },
    ],
    images: [
      img(PHOTOS.exteriorA, "Akoka Heights Hostel — front view", { isVerified: true, position: 0 }),
      img(PHOTOS.common, "Akoka Heights Hostel — common room", { isVerified: true, position: 1 }),
      img(PHOTOS.kitchen, "Akoka Heights Hostel — shared kitchen", { isVerified: true, position: 2 }),
    ],
    totalFloors: 4,
    totalUnits: 64,
    availableUnits: 12,
    occupiedUnits: 48,
    heldUnits: 4,
    priceFromKobo: 45000000,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(2),
  },
  {
    id: "prop_bariga_gardens",
    slug: "bariga-gardens-residence",
    landlordId: "dev_landlord_1",
    managerIds: ["dev_manager_1"],
    agentIds: [],
    name: "Bariga Gardens Residence",
    description:
      "A budget-friendly residence in Bariga with shared self-contain rooms and easy access to UNILAG via the Bariga shuttle. Newly renovated kitchens and reliable borehole water make it a popular pick for 100-level students.",
    type: "self_contain_block",
    status: "verified",
    verificationStatus: "approved",
    city: "Lagos",
    state: "Lagos",
    neighbourhoodId: "nbg_bariga",
    universityId: "uni_unilag",
    publicAddressLine: "Adeleye Street, Bariga",
    privateAddressLine: "23 Adeleye Street, Bariga, Somolu, Lagos",
    latitude: 6.5311,
    longitude: 3.3819,
    facilities: ["water_borehole", "security_guard", "parking", "kitchen_shared"],
    rules: [
      { id: "r1", label: "Quiet hours 11pm–6am", category: "quiet_hours" },
      { id: "r2", label: "No overnight visitors", category: "visitors" },
      { id: "r3", label: "Annual rent only", category: "payment" },
    ],
    images: [
      img(PHOTOS.exteriorB, "Bariga Gardens Residence — exterior", { isVerified: true, position: 0 }),
      img(PHOTOS.roomB, "Bariga Gardens Residence — sample room", { isVerified: false, position: 1, caption: "Representative photo" }),
    ],
    totalFloors: 2,
    totalUnits: 28,
    availableUnits: 6,
    occupiedUnits: 22,
    heldUnits: 0,
    priceFromKobo: 32000000,
    createdAt: daysAgo(80),
    updatedAt: daysAgo(5),
  },
  {
    id: "prop_yaba_suites",
    slug: "yaba-suites-apartments",
    landlordId: "dev_landlord_2",
    managerIds: [],
    agentIds: ["dev_agent_1"],
    name: "Yaba Suites Apartments",
    description:
      "Premium two-bedroom apartments in Yaba, popular with postgraduate students and visiting lecturers. Each apartment has its own kitchen, bathroom and balcony, with solar power backup for lighting and Wi-Fi.",
    type: "apartment_building",
    status: "verified",
    verificationStatus: "approved",
    city: "Lagos",
    state: "Lagos",
    neighbourhoodId: "nbg_yaba",
    universityId: "uni_unilag",
    publicAddressLine: "Herbert Macaulay Way, Yaba",
    privateAddressLine: "71 Herbert Macaulay Way, Yaba, Lagos",
    latitude: 6.4839,
    longitude: 3.3734,
    facilities: ["wifi", "solar_power", "water_borehole", "cctv", "security_guard", "parking", "laundry"],
    rules: [
      { id: "r1", label: "No subletting", category: "other" },
      { id: "r2", label: "Pets on case-by-case basis", category: "pets" },
      { id: "r3", label: "Quarterly rent payable in advance", category: "payment" },
    ],
    images: [
      img(PHOTOS.exteriorA, "Yaba Suites Apartments — front", { isVerified: true, position: 0 }),
      img(PHOTOS.roomA, "Yaba Suites Apartments — apartment living room", { isVerified: true, position: 1 }),
      img(PHOTOS.common, "Yaba Suites Apartments — balcony", { isVerified: true, position: 2 }),
    ],
    totalFloors: 3,
    totalUnits: 18,
    availableUnits: 4,
    occupiedUnits: 14,
    heldUnits: 0,
    priceFromKobo: 120000000,
    createdAt: daysAgo(200),
    updatedAt: daysAgo(1),
  },
  {
    id: "prop_somolu_terraces",
    slug: "somolu-terraces",
    landlordId: "dev_landlord_2",
    managerIds: [],
    agentIds: [],
    name: "Somolu Terraces",
    description:
      "A row of terrace-house rooms a short keke ride from UNILAG. Quiet and residential, with shared courtyards and dedicated study nooks.",
    type: "terrace_house",
    status: "verified",
    verificationStatus: "approved",
    city: "Lagos",
    state: "Lagos",
    neighbourhoodId: "nbg_somolu",
    universityId: "uni_unilag",
    publicAddressLine: "Bajulaiye Road, Somolu",
    privateAddressLine: "8 Bajulaiye Road, Somolu, Lagos",
    latitude: 6.5419,
    longitude: 3.3756,
    facilities: ["water_borehole", "security_guard", "kitchen_shared", "study_room"],
    rules: [{ id: "r1", label: "Annual rent only", category: "payment" }],
    images: [
      img(PHOTOS.exteriorB, "Somolu Terraces — street view", { isVerified: true, position: 0 }),
      img(PHOTOS.roomC, "Somolu Terraces — typical room", { isVerified: false, position: 1, caption: "Representative photo" }),
    ],
    totalFloors: 2,
    totalUnits: 16,
    availableUnits: 3,
    occupiedUnits: 13,
    heldUnits: 0,
    priceFromKobo: 38000000,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(3),
  },
  {
    id: "prop_akoka_heights_annex",
    slug: "akoka-heights-annex",
    landlordId: "dev_landlord_1",
    managerIds: [],
    agentIds: [],
    name: "Akoka Heights Annex",
    description:
      "The Annex is a newer wing of Akoka Heights, with ensuite self-contain rooms and a small gym. Currently pending verification — listings will go live once the inspection report is approved.",
    type: "hostel_block",
    status: "pending_verification",
    verificationStatus: "in_review",
    city: "Lagos",
    state: "Lagos",
    neighbourhoodId: "nbg_akoka",
    universityId: "uni_unilag",
    publicAddressLine: "St. Finbarr's College Road, Akoka",
    privateAddressLine: "16 St. Finbarr's College Road, Akoka, Yaba, Lagos",
    latitude: 6.5189,
    longitude: 3.3916,
    facilities: ["wifi", "power_backup", "water_borehole", "cctv", "security_guard", "gym"],
    rules: [
      { id: "r1", label: "No loud music after 10pm", category: "quiet_hours" },
      { id: "r2", label: "Annual rent payable in two instalments", category: "payment" },
    ],
    images: [
      img(PHOTOS.hostel, "Akoka Heights Annex — exterior (representative)", { isVerified: false, position: 0, caption: "Representative photo" }),
    ],
    totalFloors: 3,
    totalUnits: 36,
    availableUnits: 36,
    occupiedUnits: 0,
    heldUnits: 0,
    priceFromKobo: 52000000,
    createdAt: daysAgo(14),
    updatedAt: daysAgo(1),
  },
];

/* -------------------------------------------------------------------- Floors */

export const floors: Floor[] = [
  { id: "flr_ah_g", propertyId: "prop_akoka_heights", label: "Ground Floor", level: 0, defaultPriceKobo: 45000000, totalUnits: 16, availableUnits: 4, position: 0 },
  { id: "flr_ah_1", propertyId: "prop_akoka_heights", label: "First Floor", level: 1, defaultPriceKobo: 48000000, totalUnits: 16, availableUnits: 3, position: 1 },
  { id: "flr_ah_2", propertyId: "prop_akoka_heights", label: "Second Floor", level: 2, defaultPriceKobo: 52000000, totalUnits: 16, availableUnits: 3, position: 2 },
  { id: "flr_ah_3", propertyId: "prop_akoka_heights", label: "Third Floor", level: 3, defaultPriceKobo: 58000000, totalUnits: 16, availableUnits: 2, position: 3 },

  { id: "flr_bg_g", propertyId: "prop_bariga_gardens", label: "Ground Floor", level: 0, defaultPriceKobo: 32000000, totalUnits: 14, availableUnits: 3, position: 0 },
  { id: "flr_bg_1", propertyId: "prop_bariga_gardens", label: "First Floor", level: 1, defaultPriceKobo: 35000000, totalUnits: 14, availableUnits: 3, position: 1 },

  { id: "flr_ys_g", propertyId: "prop_yaba_suites", label: "Ground Floor", level: 0, defaultPriceKobo: 120000000, totalUnits: 6, availableUnits: 1, position: 0 },
  { id: "flr_ys_1", propertyId: "prop_yaba_suites", label: "First Floor", level: 1, defaultPriceKobo: 125000000, totalUnits: 6, availableUnits: 1, position: 1 },
  { id: "flr_ys_2", propertyId: "prop_yaba_suites", label: "Second Floor", level: 2, defaultPriceKobo: 130000000, totalUnits: 6, availableUnits: 2, position: 2 },
];

/* ----------------------------------------------------- Rentable units (rooms) */

function roomCharges(extra: AdditionalCharge[] = []): AdditionalCharge[] {
  return [
    { id: "chg_service", label: "Service charge", amountKobo: 5000000, frequency: "annual" },
    { id: "chg_caution", label: "Caution deposit", amountKobo: 10000000, frequency: "one_time" },
    ...extra,
  ];
}

export const rooms: RentableUnit[] = [
  // Akoka Heights — ground floor
  {
    id: "room_ah_g101", identifier: "G-101", slug: "g-101",
    propertyId: "prop_akoka_heights", floorId: "flr_ah_g",
    unitType: "self_contain", status: "available",
    capacity: 1, bedrooms: 1, bathrooms: 1, hasBalcony: false, hasWindow: true, sizeSqM: 14,
    facilities: ["fan", "wardrobe", "desk_chair", "ensuite_bathroom", "window"],
    furnishing: "semi_furnished",
    images: [img(PHOTOS.roomA, "G-101 — self-contain room", { isVerified: true })],
    representativeImagesOnly: false,
    annualRentKobo: 45000000, rentalPeriod: "annual",
    additionalCharges: roomCharges(),
    cautionDepositKobo: 10000000,
    availableFrom: days(7), availableTo: days(370),
    bookingTerms: "Annual lease renewable. Two instalments acceptable with management approval.",
    createdAt: daysAgo(60), updatedAt: daysAgo(2),
  },
  {
    id: "room_ah_g102", identifier: "G-102", slug: "g-102",
    propertyId: "prop_akoka_heights", floorId: "flr_ah_g",
    unitType: "self_contain", status: "available",
    capacity: 1, bedrooms: 1, bathrooms: 1, hasBalcony: false, hasWindow: true, sizeSqM: 14,
    facilities: ["fan", "wardrobe", "desk_chair", "ensuite_bathroom", "window"],
    furnishing: "semi_furnished",
    images: [img(PHOTOS.roomA, "G-102 — self-contain room", { isVerified: true })],
    representativeImagesOnly: false,
    annualRentKobo: 45000000, rentalPeriod: "annual",
    additionalCharges: roomCharges(),
    cautionDepositKobo: 10000000,
    availableFrom: days(7), availableTo: days(370),
    bookingTerms: "Annual lease renewable. Two instalments acceptable with management approval.",
    createdAt: daysAgo(60), updatedAt: daysAgo(2),
  },
  {
    id: "room_ah_g103", identifier: "G-103", slug: "g-103",
    propertyId: "prop_akoka_heights", floorId: "flr_ah_g",
    unitType: "shared_room", status: "available",
    capacity: 2, bedrooms: 1, bathrooms: 1, hasBalcony: false, hasWindow: true, sizeSqM: 20,
    facilities: ["fan", "wardrobe", "shared_bathroom", "window"],
    furnishing: "semi_furnished",
    images: [img(PHOTOS.roomB, "G-103 — shared room", { isVerified: true })],
    representativeImagesOnly: false,
    annualRentKobo: 32000000, rentalPeriod: "annual",
    additionalCharges: roomCharges(),
    cautionDepositKobo: 8000000,
    availableFrom: days(7), availableTo: days(370),
    bookingTerms: "Shared room — both occupants must be named on the lease.",
    createdAt: daysAgo(60), updatedAt: daysAgo(2),
  },
  {
    id: "room_ah_g104", identifier: "G-104", slug: "g-104",
    propertyId: "prop_akoka_heights", floorId: "flr_ah_g",
    unitType: "self_contain", status: "occupied",
    capacity: 1, bedrooms: 1, bathrooms: 1, hasBalcony: false, hasWindow: false, sizeSqM: 12,
    facilities: ["fan", "wardrobe", "ensuite_bathroom"],
    furnishing: "semi_furnished",
    images: [img(PHOTOS.roomC, "G-104 — self-contain (representative)", { isVerified: false })],
    representativeImagesOnly: true,
    annualRentKobo: 43000000, rentalPeriod: "annual",
    additionalCharges: roomCharges(),
    availableFrom: days(380), availableTo: days(740),
    bookingTerms: "Currently occupied. Available from next lease cycle.",
    activeBookingId: "bkg_occupied_1",
    createdAt: daysAgo(60), updatedAt: daysAgo(15),
  },

  // Akoka Heights — first floor
  {
    id: "room_ah_1101", identifier: "1-101", slug: "1-101",
    propertyId: "prop_akoka_heights", floorId: "flr_ah_1",
    unitType: "self_contain", status: "available",
    capacity: 1, bedrooms: 1, bathrooms: 1, hasBalcony: true, hasWindow: true, sizeSqM: 16,
    facilities: ["ac", "wardrobe", "desk_chair", "ensuite_bathroom", "balcony", "window"],
    furnishing: "fully_furnished",
    images: [img(PHOTOS.roomD, "1-101 — premium self-contain", { isVerified: true })],
    representativeImagesOnly: false,
    annualRentKobo: 55000000, rentalPeriod: "annual",
    additionalCharges: roomCharges([{ id: "chg_ac", label: "A/C surcharge", amountKobo: 1500000, frequency: "annual" }]),
    cautionDepositKobo: 12000000,
    availableFrom: days(3), availableTo: days(366),
    bookingTerms: "Premium room. Two instalments acceptable with management approval.",
    createdAt: daysAgo(50), updatedAt: daysAgo(1),
  },
  {
    id: "room_ah_1102", identifier: "1-102", slug: "1-102",
    propertyId: "prop_akoka_heights", floorId: "flr_ah_1",
    unitType: "self_contain", status: "held",
    capacity: 1, bedrooms: 1, bathrooms: 1, hasBalcony: false, hasWindow: true, sizeSqM: 14,
    facilities: ["ac", "wardrobe", "desk_chair", "ensuite_bathroom", "window"],
    furnishing: "fully_furnished",
    images: [img(PHOTOS.roomD, "1-102 — premium self-contain", { isVerified: true })],
    representativeImagesOnly: false,
    annualRentKobo: 53000000, rentalPeriod: "annual",
    additionalCharges: roomCharges(),
    cautionDepositKobo: 11000000,
    availableFrom: days(3), availableTo: days(366),
    bookingTerms: "Currently on temporary hold pending payment confirmation.",
    activeHoldId: "hold_1",
    createdAt: daysAgo(50), updatedAt: daysAgo(0),
  },

  // Yaba Suites — apartments (entire unit, 2 bedrooms)
  {
    id: "room_ys_a1", identifier: "A-1", slug: "apartment-a1",
    propertyId: "prop_yaba_suites", floorId: "flr_ys_g",
    unitType: "apartment", status: "available",
    capacity: 2, bedrooms: 2, bathrooms: 2, hasBalcony: true, hasWindow: true, sizeSqM: 55,
    facilities: ["ac", "kitchen_private", "ensuite_bathroom", "balcony", "window", "wardrobe", "desk_chair"],
    furnishing: "fully_furnished",
    images: [
      img(PHOTOS.roomA, "Apartment A-1 — living room", { isVerified: true, position: 0 }),
      img(PHOTOS.kitchen, "Apartment A-1 — kitchen", { isVerified: true, position: 1 }),
      img(PHOTOS.bathroom, "Apartment A-1 — bathroom", { isVerified: true, position: 2 }),
    ],
    representativeImagesOnly: false,
    annualRentKobo: 120000000, rentalPeriod: "biannual",
    additionalCharges: [
      { id: "chg_service_ys", label: "Service charge", amountKobo: 12000000, frequency: "annual" },
      { id: "chg_caution_ys", label: "Caution deposit", amountKobo: 20000000, frequency: "one_time" },
    ],
    cautionDepositKobo: 20000000,
    availableFrom: days(14), availableTo: days(380),
    bookingTerms: "Entire apartment let as one unit. Quarterly rent option available.",
    createdAt: daysAgo(180), updatedAt: daysAgo(7),
  },
  {
    id: "room_ys_a2", identifier: "A-2", slug: "apartment-a2",
    propertyId: "prop_yaba_suites", floorId: "flr_ys_g",
    unitType: "apartment", status: "occupied",
    capacity: 2, bedrooms: 2, bathrooms: 2, hasBalcony: true, hasWindow: true, sizeSqM: 55,
    facilities: ["ac", "kitchen_private", "ensuite_bathroom", "balcony", "window", "wardrobe"],
    furnishing: "fully_furnished",
    images: [img(PHOTOS.roomA, "Apartment A-2 (representative)", { isVerified: false })],
    representativeImagesOnly: true,
    annualRentKobo: 120000000, rentalPeriod: "biannual",
    additionalCharges: [
      { id: "chg_service_ys2", label: "Service charge", amountKobo: 12000000, frequency: "annual" },
    ],
    availableFrom: days(200), availableTo: days(560),
    bookingTerms: "Currently occupied. Available from next lease cycle.",
    activeBookingId: "bkg_occupied_2",
    createdAt: daysAgo(180), updatedAt: daysAgo(20),
  },
];

/* -------------------------------------------------------- Bookings & payments */

export const bookings: Booking[] = [
  {
    id: "bkg_demo_1",
    reference: "NLG-BKG-7XQK4L",
    studentId: "dev_student_1",
    propertyId: "prop_akoka_heights",
    rentableUnitId: "room_ah_g101",
    status: "confirmed",
    currentStep: "booking_confirmation",
    checkIn: days(7),
    checkOut: days(372),
    rentalPeriod: "annual",
    baseRentKobo: 45000000,
    additionalChargesKobo: 5000000,
    cautionDepositKobo: 10000000,
    serviceFeeKobo: 2250000,
    totalKobo: 62250000,
    paidKobo: 62250000,
    outstandingKobo: 0,
    holdExpiresAt: daysAgo(2),
    confirmedAt: daysAgo(2),
    createdAt: daysAgo(5),
    updatedAt: daysAgo(2),
  },
  {
    id: "bkg_demo_2",
    reference: "NLG-BKG-3PD8TM",
    studentId: "dev_student_1",
    propertyId: "prop_yaba_suites",
    rentableUnitId: "room_ys_a1",
    status: "pending_payment",
    currentStep: "payment_initiation",
    checkIn: days(14),
    checkOut: days(379),
    rentalPeriod: "biannual",
    baseRentKobo: 120000000,
    additionalChargesKobo: 12000000,
    cautionDepositKobo: 20000000,
    serviceFeeKobo: 6000000,
    totalKobo: 158000000,
    paidKobo: 0,
    outstandingKobo: 158000000,
    holdExpiresAt: days(1),
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },
  {
    id: "bkg_demo_3",
    reference: "NLG-BKG-9RE2XH",
    studentId: "dev_student_1",
    propertyId: "prop_bariga_gardens",
    rentableUnitId: "room_ah_g103",
    status: "completed",
    currentStep: "payment_reconciliation",
    checkIn: daysAgo(360),
    checkOut: daysAgo(5),
    rentalPeriod: "annual",
    baseRentKobo: 32000000,
    additionalChargesKobo: 5000000,
    cautionDepositKobo: 8000000,
    serviceFeeKobo: 1600000,
    totalKobo: 46600000,
    paidKobo: 46600000,
    outstandingKobo: 0,
    confirmedAt: daysAgo(365),
    createdAt: daysAgo(370),
    updatedAt: daysAgo(5),
  },
];

export const payments: Payment[] = [
  {
    id: "pay_demo_1",
    reference: "NLG-PAY-AB12CD",
    gatewayReference: "PSK_Z9xy87654321",
    bookingId: "bkg_demo_1",
    studentId: "dev_student_1",
    amountKobo: 62250000,
    feeKobo: 1462500,
    netKobo: 60787500,
    currency: "NGN",
    channel: "card",
    status: "successful",
    confirmedByBackend: true,
    initiatedAt: daysAgo(5),
    confirmedAt: daysAgo(2),
    receiptUrl: "#receipt-1",
  },
  {
    id: "pay_demo_2",
    reference: "NLG-PAY-EF34GH",
    bookingId: "bkg_demo_2",
    studentId: "dev_student_1",
    amountKobo: 158000000,
    feeKobo: 3705000,
    netKobo: 154295000,
    currency: "NGN",
    channel: "card",
    status: "initiated",
    confirmedByBackend: false,
    initiatedAt: daysAgo(0),
  },
];

export const payouts: Payout[] = [
  {
    id: "pot_demo_1",
    reference: "NLG-POT-QA12WB",
    landlordId: "dev_landlord_1",
    bookingId: "bkg_demo_1",
    grossKobo: 62250000,
    platformFeeKobo: 2250000,
    netKobo: 60000000,
    status: "settled",
    settledAt: daysAgo(1),
    bankAccountMasked: "GTBank •••• 4821",
    scheduledFor: daysAgo(1),
    createdAt: daysAgo(2),
    eligibilityFlags: [],
  },
  {
    id: "pot_demo_2",
    reference: "NLG-POT-LM34ZR",
    landlordId: "dev_landlord_1",
    bookingId: "bkg_demo_3",
    grossKobo: 46600000,
    platformFeeKobo: 1600000,
    netKobo: 45000000,
    status: "settled",
    settledAt: daysAgo(120),
    bankAccountMasked: "GTBank •••• 4821",
    scheduledFor: daysAgo(120),
    createdAt: daysAgo(125),
    eligibilityFlags: [],
  },
];

/* --------------------------------------------------------------- Notifications */

export const notifications: AppNotification[] = [
  {
    id: "ntf_1",
    userId: "dev_student_1",
    type: "booking_update",
    title: "Booking confirmed",
    body: "Your booking for G-101 at Akoka Heights Hostel has been confirmed. Move-in is in 7 days.",
    href: "/student/bookings/bkg_demo_1",
    read: false,
    createdAt: daysAgo(2),
  },
  {
    id: "ntf_2",
    userId: "dev_student_1",
    type: "payment_update",
    title: "Payment pending",
    body: "Your payment for Apartment A-1 at Yaba Suites is awaiting confirmation. Hold expires in 1 day.",
    href: "/student/bookings/bkg_demo_2",
    read: false,
    createdAt: daysAgo(0),
  },
  {
    id: "ntf_3",
    userId: "dev_student_1",
    type: "system",
    title: "Welcome to NetLodge",
    body: "Complete your profile to get personalised accommodation recommendations.",
    href: "/student/profile",
    read: true,
    createdAt: daysAgo(30),
  },
  {
    id: "ntf_l1",
    userId: "dev_landlord_1",
    type: "booking_update",
    title: "New booking received",
    body: "A student has placed a booking for G-101 at Akoka Heights Hostel.",
    href: "/landlord/bookings/bkg_demo_1",
    read: false,
    createdAt: daysAgo(5),
  },
  {
    id: "ntf_l2",
    userId: "dev_landlord_1",
    type: "verification_update",
    title: "Verification approved",
    body: "Your landlord verification has been approved. You can now publish listings publicly.",
    href: "/landlord/verification",
    read: true,
    createdAt: daysAgo(60),
  },
];

/* ------------------------------------------------------------------- Support */

export const supportTickets: SupportTicket[] = [
  {
    id: "tkt_1",
    reference: "NLG-TKT-2KQ8FV",
    userId: "dev_student_1",
    subject: "Question about caution deposit refund",
    category: "Payments",
    priority: "medium",
    status: "resolved",
    message:
      "Hello, my tenancy at Bariga Gardens ended last week. When will my caution deposit be refunded?",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(7),
    escalated: false,
    replies: [
      {
        id: "r_1",
        author: "support",
        message:
          "Hello! Your caution deposit refund has been initiated and will land in your original payment account within 5–7 business days. Thank you for your patience.",
        createdAt: daysAgo(7),
      },
    ],
  },
];

/* -------------------------------------------------------------------- Saved */

export const savedProperties: SavedProperty[] = [
  {
    id: "sav_1",
    userId: "dev_student_1",
    propertyId: "prop_yaba_suites",
    savedAt: daysAgo(12),
    notes: "Worth the splurge if I get the postgraduate scholarship.",
  },
  {
    id: "sav_2",
    userId: "dev_student_1",
    propertyId: "prop_somolu_terraces",
    savedAt: daysAgo(4),
  },
];

/* --------------------------------------------------- Convenience selectors */

export function getUniversityBySlug(slug: string): University | undefined {
  return universities.find((u) => u.slug === slug);
}

export function getNeighbourhoodBySlug(slug: string): Neighbourhood | undefined {
  return neighbourhoods.find((n) => n.slug === slug);
}

export function getPropertyBySlug(slug: string): Property | undefined {
  return properties.find((p) => p.slug === slug);
}

export function getRoomById(id: string): RentableUnit | undefined {
  return rooms.find((r) => r.id === id || r.slug === id);
}

export function getRoomsForProperty(propertyId: string): RentableUnit[] {
  return rooms.filter((r) => r.propertyId === propertyId);
}

export function getFloorsForProperty(propertyId: string): Floor[] {
  return floors.filter((f) => f.propertyId === propertyId);
}

export function getBookingsForStudent(studentId: string): Booking[] {
  return bookings.filter((b) => b.studentId === studentId);
}

export function getPaymentsForStudent(studentId: string): Payment[] {
  return payments.filter((p) => p.studentId === studentId);
}

export function getNotificationsForUser(userId: string): AppNotification[] {
  return notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}
