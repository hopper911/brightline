export type Service = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  heroTagline: string;
  portfolioLabel: string;
  portfolioHref: string;
  heroImage: string;
  proofImages: string[];
  industries: string[];
  deliverables: string[];
  process: string[];
  pricing: {
    label: string;
    range: string;
    disclaimer: string;
    licensing: string;
  };
  faqs: { q: string; a: string }[];
  caseStudies: { slug: string; title: string; category: string; image: string; meta: string }[];
};

export const services: Service[] = [
  {
    slug: "architecture-photography",
    title: "Architecture & Spaces Photography",
    summary:
      "Guest-first imagery for hotels, resorts, and wellness brands that need bookings to convert.",
    description:
      "We capture the full guest journey—rooms, amenities, dining, and atmosphere—designed for booking engines, campaigns, and social.",
    heroTagline: "Rooms, amenities, and atmosphere designed to convert.",
    portfolioLabel: "Architecture Portfolio",
    portfolioHref: "/work/tri",
    heroImage: "/images/hospitality.jpg",
    proofImages: ["/images/hospitality.jpg", "/images/food.jpg", "/images/hero.jpg"],
    industries: ["Hotels + resorts", "Wellness + spa", "Boutique properties", "Travel + lifestyle"],
    deliverables: [
      "Hero room suite sets (day + dusk)",
      "Amenity and lifestyle vignettes",
      "Food + beverage editorial set",
      "Social cutdowns and vertical crops",
    ],
    process: [
      "Pre-production call + shot list",
      "On-site art direction + capture",
      "Curated proof gallery within 5–7 days",
      "Final delivery + optimized crops",
    ],
    pricing: {
      label: "Typical investment",
      range: "$4.5k–$12k",
      disclaimer:
        "Pricing reflects half-day to multi-day architecture coverage and scales with room count, styling, and usage.",
      licensing:
        "Usage includes web, listings, and editorial. Paid media, OOH, and global campaigns are quoted separately.",
    },
    faqs: [
      {
        q: "How long does an architecture shoot take?",
        a: "Most properties book 1–3 production days depending on room count and amenities.",
      },
      {
        q: "Do you work with on-site teams?",
        a: "Yes—housekeeping, F&B, and marketing teams coordinate with us to stage each scene.",
      },
      {
        q: "Can you deliver seasonal updates?",
        a: "Absolutely. We offer quarterly or seasonal refresh packages for campaigns.",
      },
    ],
    caseStudies: [
      {
        slug: "hotel-01",
        title: "Harborline Hotel",
        category: "Architecture",
        image: "/work/hotel-01/cover.svg",
        meta: "Miami, FL · 2025",
      },
      {
        slug: "hotel-02",
        title: "Cedar House Resort",
        category: "Architecture",
        image: "/work/hotel-02/cover.svg",
        meta: "Nashville, TN · 2025",
      },
    ],
  },
  {
    slug: "commercial-real-estate-photography",
    title: "Commercial Real Estate Photography",
    summary:
      "Architectural clarity for leasing, investment decks, and luxury developments.",
    description:
      "We focus on scale, daylight, and composition so assets feel premium across web, print, and investor materials.",
    heroTagline: "Architecture-first visuals for premium leasing.",
    portfolioLabel: "Real Estate Portfolio",
    portfolioHref: "/work/rea",
    heroImage: "/images/real-estate.jpg",
    proofImages: ["/images/real-estate.jpg", "/images/design.jpg", "/images/hero.jpg"],
    industries: ["Office + mixed-use", "Luxury residential", "Retail + lobby", "Amenity suites"],
    deliverables: [
      "Exterior hero + context shots",
      "Interior suites + amenity sets",
      "Floor-to-ceiling detailing",
      "Investor deck-ready selects",
    ],
    process: [
      "Site walk + lighting plan",
      "Capture day with staging support",
      "Proofing gallery + selects",
      "Final delivery with print/web crops",
    ],
    pricing: {
      label: "Starting at",
      range: "$3k–$9k",
      disclaimer:
        "Guidance pricing for single-asset and multi-suite coverage. Final scope depends on square footage, access, and deliverables.",
      licensing:
        "Usage covers web and leasing/listing materials. Editorial, paid placements, and OOH require expanded licensing.",
    },
    faqs: [
      {
        q: "Do you shoot construction progress?",
        a: "Yes. We offer milestone documentation for developers and investors.",
      },
      {
        q: "Can you match existing brand guidelines?",
        a: "We align color, contrast, and composition to your brand system.",
      },
      {
        q: "Do you deliver drone images?",
        a: "Available by request with licensed partners.",
      },
    ],
    caseStudies: [
      {
        slug: "real-estate-01",
        title: "Northpoint Tower",
        category: "Commercial Photography",
        image: "/work/real-estate-01/cover.svg",
        meta: "Chicago, IL · 2025",
      },
      {
        slug: "real-estate-02",
        title: "Riverfront Exchange",
        category: "Commercial Photography",
        image: "/work/real-estate-02/cover.svg",
        meta: "Austin, TX · 2025",
      },
    ],
  },
  {
    slug: "fashion-campaign-photography",
    title: "Fashion Campaign Photography",
    summary:
      "Editorial campaigns with cinematic lighting and tailored art direction.",
    description:
      "From concept boards to final selects, we build a visual story designed to scale across lookbooks and campaigns.",
    heroTagline: "Editorial lighting with campaign-level polish.",
    portfolioLabel: "Fashion Portfolio",
    portfolioHref: "/work/acd",
    heroImage: "/images/fashion.jpg",
    proofImages: ["/images/fashion.jpg", "/images/hero.jpg", "/images/design.jpg"],
    industries: ["Editorial", "Lookbooks", "Campaigns", "Ecommerce"],
    deliverables: [
      "Lookbook hero sets",
      "Campaign close-ups + texture",
      "Studio + location combinations",
      "Social and ecommerce crops",
    ],
    process: [
      "Concept + moodboard alignment",
      "Styling + production coordination",
      "Capture day with live art direction",
      "Final selects with retouching",
    ],
    pricing: {
      label: "Typical investment",
      range: "$6k–$18k",
      disclaimer:
        "Campaign pricing varies with talent, locations, and retouching depth. We provide a detailed estimate after a short call.",
      licensing:
        "Usage includes web, ecommerce, and editorial. Paid media, OOH, and global buys are quoted separately.",
    },
    faqs: [
      {
        q: "Do you handle styling?",
        a: "We collaborate with stylists or provide recommendations based on project scope.",
      },
      {
        q: "Can we shoot in multiple locations?",
        a: "Yes—multi-location days are common for campaign work.",
      },
      {
        q: "What is your typical turnaround?",
        a: "Proofs in 5–7 days, finals in 10–14 days depending on retouching.",
      },
    ],
    caseStudies: [
      {
        slug: "fashion-01",
        title: "Aurum Atelier",
        category: "Fashion",
        image: "/work/fashion-01/cover.svg",
        meta: "New York, NY · 2025",
      },
      {
        slug: "fashion-02",
        title: "Noir Atelier",
        category: "Fashion",
        image: "/work/fashion-02/cover.svg",
        meta: "Los Angeles, CA · 2025",
      },
    ],
  },
];
