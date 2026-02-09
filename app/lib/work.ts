export type WorkItem = {
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  location: string;
  year: string;
  description: string;
  cover: string;
  gallery: string[];
  stats: { label: string; value: string }[];
};

export const slugifyCategory = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const makeGallery = (slug: string) => [
  `/work/${slug}/cover.svg`,
  `/work/${slug}/detail-01.svg`,
  `/work/${slug}/detail-02.svg`,
];

export const workItems: WorkItem[] = [
  {
    slug: "real-estate-01",
    title: "Northpoint Tower",
    category: "Commercial Photography",
    categorySlug: "commercial-real-estate",
    location: "Chicago, IL",
    year: "2025",
    description:
      "A vertical brand story for a skyline office tower, balancing big architectural lines with intimate amenity moments.",
    cover: "/work/real-estate-01/cover.svg",
    gallery: makeGallery("real-estate-01"),
    stats: [
      { label: "Deliverables", value: "36 final images" },
      { label: "Shoot window", value: "2 days" },
      { label: "Usage", value: "Leasing package" },
    ],
  },
  {
    slug: "real-estate-02",
    title: "Riverfront Exchange",
    category: "Commercial Photography",
    categorySlug: "commercial-real-estate",
    location: "Austin, TX",
    year: "2025",
    description:
      "Sunrise-to-dusk coverage for a mixed-use district launch, focused on tenant experience and public-facing amenities.",
    cover: "/work/real-estate-02/cover.svg",
    gallery: makeGallery("real-estate-02"),
    stats: [
      { label: "Deliverables", value: "40 final images" },
      { label: "Shoot window", value: "3 days" },
      { label: "Usage", value: "Launch campaign" },
    ],
  },
  {
    slug: "real-estate-03",
    title: "Atlas Square Offices",
    category: "Commercial Photography",
    categorySlug: "commercial-real-estate",
    location: "Seattle, WA",
    year: "2024",
    description:
      "An office repositioning story that highlights natural light, flexible work zones, and hospitality-forward details.",
    cover: "/work/real-estate-03/cover.svg",
    gallery: makeGallery("real-estate-03"),
    stats: [
      { label: "Deliverables", value: "32 final images" },
      { label: "Shoot window", value: "2 days" },
      { label: "Usage", value: "Broker toolkit" },
    ],
  },
  {
    slug: "real-estate-04",
    title: "Founders Plaza",
    category: "Commercial Photography",
    categorySlug: "commercial-real-estate",
    location: "Denver, CO",
    year: "2024",
    description:
      "A clean, modern campaign set for a workplace campus, designed for investor decks and digital leasing funnels.",
    cover: "/work/real-estate-04/cover.svg",
    gallery: makeGallery("real-estate-04"),
    stats: [
      { label: "Deliverables", value: "34 final images" },
      { label: "Shoot window", value: "2 days" },
      { label: "Usage", value: "Investor + web" },
    ],
  },
  {
    slug: "real-estate-05",
    title: "Skyline Tech Campus",
    category: "Commercial Photography",
    categorySlug: "commercial-real-estate",
    location: "San Jose, CA",
    year: "2026",
    description:
      "Campus-wide image system built around scale, employee experience, and polished architectural storytelling.",
    cover: "/work/real-estate-05/cover.svg",
    gallery: makeGallery("real-estate-05"),
    stats: [
      { label: "Deliverables", value: "48 final images" },
      { label: "Shoot window", value: "4 days" },
      { label: "Usage", value: "National campaign" },
    ],
  },
  {
    slug: "hotel-01",
    title: "Harborline Hotel",
    category: "Hospitality",
    categorySlug: "hospitality",
    location: "Miami, FL",
    year: "2025",
    description:
      "A sun-washed coastal property captured across dusk, dawn, and golden hour to spotlight texture and guest flow.",
    cover: "/work/hotel-01/cover.svg",
    gallery: makeGallery("hotel-01"),
    stats: [
      { label: "Deliverables", value: "42 final images" },
      { label: "Shoot window", value: "3 days" },
      { label: "Usage", value: "Global campaign" },
    ],
  },
  {
    slug: "hotel-02",
    title: "Cedar House Resort",
    category: "Hospitality",
    categorySlug: "hospitality",
    location: "Nashville, TN",
    year: "2025",
    description:
      "Warm, story-led coverage of rooms, dining, and wellness spaces for a boutique resort relaunch.",
    cover: "/work/hotel-02/cover.svg",
    gallery: makeGallery("hotel-02"),
    stats: [
      { label: "Deliverables", value: "38 final images" },
      { label: "Shoot window", value: "2 days" },
      { label: "Usage", value: "Booking engine" },
    ],
  },
  {
    slug: "hotel-03",
    title: "The Meridian House",
    category: "Hospitality",
    categorySlug: "hospitality",
    location: "Charleston, SC",
    year: "2024",
    description:
      "A romantic visual narrative tailored for destination travelers, with emphasis on suites and culinary experiences.",
    cover: "/work/hotel-03/cover.svg",
    gallery: makeGallery("hotel-03"),
    stats: [
      { label: "Deliverables", value: "35 final images" },
      { label: "Shoot window", value: "2 days" },
      { label: "Usage", value: "OTA + social" },
    ],
  },
  {
    slug: "hotel-04",
    title: "Oasis Grand",
    category: "Hospitality",
    categorySlug: "hospitality",
    location: "Scottsdale, AZ",
    year: "2026",
    description:
      "Desert light-driven campaign focused on outdoor amenities, spa rituals, and elevated guest moments.",
    cover: "/work/hotel-04/cover.svg",
    gallery: makeGallery("hotel-04"),
    stats: [
      { label: "Deliverables", value: "44 final images" },
      { label: "Shoot window", value: "3 days" },
      { label: "Usage", value: "Seasonal campaign" },
    ],
  },
  {
    slug: "hotel-05",
    title: "Monroe Waterfront",
    category: "Hospitality",
    categorySlug: "hospitality",
    location: "San Diego, CA",
    year: "2024",
    description:
      "A polished launch library for a waterfront property, crafted for paid media, web, and PR distribution.",
    cover: "/work/hotel-05/cover.svg",
    gallery: makeGallery("hotel-05"),
    stats: [
      { label: "Deliverables", value: "41 final images" },
      { label: "Shoot window", value: "3 days" },
      { label: "Usage", value: "Web + PR" },
    ],
  },
  {
    slug: "fashion-01",
    title: "Aurum Atelier",
    category: "Fashion",
    categorySlug: "fashion",
    location: "New York, NY",
    year: "2025",
    description:
      "A moody editorial series pairing runway energy with intimate studio portraits for campaign rollout.",
    cover: "/work/fashion-01/cover.svg",
    gallery: makeGallery("fashion-01"),
    stats: [
      { label: "Deliverables", value: "28 final images" },
      { label: "Shoot window", value: "1 day" },
      { label: "Usage", value: "Editorial release" },
    ],
  },
  {
    slug: "fashion-02",
    title: "Noir Atelier",
    category: "Fashion",
    categorySlug: "fashion",
    location: "Los Angeles, CA",
    year: "2025",
    description:
      "Campaign visuals built around movement, tailored silhouettes, and high-contrast lighting for seasonal drops.",
    cover: "/work/fashion-02/cover.svg",
    gallery: makeGallery("fashion-02"),
    stats: [
      { label: "Deliverables", value: "30 final images" },
      { label: "Shoot window", value: "2 days" },
      { label: "Usage", value: "Paid social" },
    ],
  },
  {
    slug: "fashion-03",
    title: "Studio Lune",
    category: "Fashion",
    categorySlug: "fashion",
    location: "Paris, FR",
    year: "2024",
    description:
      "An editorial lookbook production mixing street texture with controlled studio sets for omnichannel launch.",
    cover: "/work/fashion-03/cover.svg",
    gallery: makeGallery("fashion-03"),
    stats: [
      { label: "Deliverables", value: "26 final images" },
      { label: "Shoot window", value: "1 day" },
      { label: "Usage", value: "Lookbook + web" },
    ],
  },
  {
    slug: "fashion-04",
    title: "Maison Arc",
    category: "Fashion",
    categorySlug: "fashion",
    location: "Milan, IT",
    year: "2026",
    description:
      "Luxury campaign direction focused on material detail, gesture, and cinematic framing for global release.",
    cover: "/work/fashion-04/cover.svg",
    gallery: makeGallery("fashion-04"),
    stats: [
      { label: "Deliverables", value: "33 final images" },
      { label: "Shoot window", value: "2 days" },
      { label: "Usage", value: "Global campaign" },
    ],
  },
  {
    slug: "fashion-05",
    title: "Velvet Thread",
    category: "Fashion",
    categorySlug: "fashion",
    location: "London, UK",
    year: "2024",
    description:
      "A narrative-led fashion story balancing portrait intimacy with statement full-body campaign frames.",
    cover: "/work/fashion-05/cover.svg",
    gallery: makeGallery("fashion-05"),
    stats: [
      { label: "Deliverables", value: "29 final images" },
      { label: "Shoot window", value: "1 day" },
      { label: "Usage", value: "Ecommerce + social" },
    ],
  },
  {
    slug: "food-01",
    title: "Sable & Salt",
    category: "Culinary",
    categorySlug: "culinary",
    location: "San Francisco, CA",
    year: "2025",
    description:
      "Editorial food and beverage storytelling for a coastal restaurant group—hero dishes, bar moments, and atmosphere shots for web and social.",
    cover: "/images/food.jpg",
    gallery: ["/images/food.jpg"],
    stats: [
      { label: "Deliverables", value: "24 final images" },
      { label: "Shoot window", value: "1 day" },
      { label: "Usage", value: "Web + social" },
    ],
  },
];

export const getWorkBySlug = (slug: string) =>
  workItems.find((item) => item.slug === slug);

export const getWorkByCategoryAndSlug = (category: string, slug: string) =>
  workItems.find(
    (item) => item.categorySlug === category && item.slug === slug
  );
