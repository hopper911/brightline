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

export const workItems: WorkItem[] = [
  {
    slug: "hotel-01",
    title: "Harborline Hotel",
    category: "Hospitality",
    categorySlug: "hospitality",
    location: "Miami, FL",
    year: "2025",
    description:
      "A sun-washed coastal property captured across dusk, dawn, and the golden hour to spotlight texture, light, and guest flow.",
    cover: "/work/hotel-01/cover.svg",
    gallery: [
      "/work/hotel-01/cover.svg",
      "/work/hotel-01/detail-01.svg",
      "/work/hotel-01/detail-02.svg",
    ],
    stats: [
      { label: "Deliverables", value: "42 final images" },
      { label: "Shoot window", value: "3 days" },
      { label: "Usage", value: "Global campaign" },
    ],
  },
  {
    slug: "real-estate-01",
    title: "Northpoint Tower",
    category: "Commercial Real Estate",
    categorySlug: "commercial-real-estate",
    location: "Chicago, IL",
    year: "2024",
    description:
      "A vertical story for a landmark tower, balancing skyline scale with intimate amenity moments.",
    cover: "/work/real-estate-01/cover.svg",
    gallery: [
      "/work/real-estate-01/cover.svg",
      "/work/real-estate-01/detail-01.svg",
      "/work/real-estate-01/detail-02.svg",
    ],
    stats: [
      { label: "Deliverables", value: "36 final images" },
      { label: "Shoot window", value: "2 days" },
      { label: "Usage", value: "Leasing package" },
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
      "A moody, high-contrast editorial series that pairs runway energy with intimate studio portraits.",
    cover: "/work/fashion-01/cover.svg",
    gallery: [
      "/work/fashion-01/cover.svg",
      "/work/fashion-01/detail-01.svg",
      "/work/fashion-01/detail-02.svg",
    ],
    stats: [
      { label: "Deliverables", value: "28 final images" },
      { label: "Shoot window", value: "1 day" },
      { label: "Usage", value: "Editorial release" },
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
      "A layered food story built around texture, steam, and soft morning light for a new seasonal menu launch.",
    cover: "/work/food-01/cover.jpg",
    gallery: [
      "/work/food-01/cover.jpg",
      "/work/food-01/detail-01.jpg",
      "/work/food-01/detail-02.jpg",
    ],
    stats: [
      { label: "Deliverables", value: "24 final images" },
      { label: "Shoot window", value: "1 day" },
      { label: "Usage", value: "Menu + social" },
    ],
  },
];

export const getWorkBySlug = (slug: string) =>
  workItems.find((item) => item.slug === slug);

export const getWorkByCategoryAndSlug = (category: string, slug: string) =>
  workItems.find(
    (item) => item.categorySlug === category && item.slug === slug
  );
