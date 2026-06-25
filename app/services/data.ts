export type Service = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  overview: string[];
  serviceDetails: { title: string; body: string }[];
  bestFor: string[];
  heroTagline: string;
  portfolioLabel: string;
  portfolioHref: string;
  heroImage: string;
  heroVideo?: string;
  backgroundMediaUrl?: string;
  backgroundPosterUrl?: string;
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
  caseStudies: {
    slug: string;
    title: string;
    category: string;
    image: string;
    meta: string;
    href?: string;
  }[];
  /** Show the case study cards near the bottom of the service page (default on). */
  caseStudiesEnabled?: boolean;
  caseStudiesIntro?: string;
  /** Cross-link block before FAQs (default on). */
  relatedServicesEnabled?: boolean;
  relatedServicesIntro?: string;
  relatedServicesLinks?: { slug: string; title: string }[];
  showRelatedContactButton?: boolean;
};

export const services: Service[] = [
  {
    slug: "architecture-photography",
    title: "Architecture & Spaces Photography",
    summary:
      "Full architectural coverage for interiors, exteriors, amenities, and designed environments, built for portfolios, leasing, press, awards, and brand systems.",
    description:
      "Architecture and spaces photography for teams that need more than a beautiful hero image. We document the design intent, material quality, circulation, light, and atmosphere of a space so the final image library can support websites, proposals, editorial pitches, leasing, social content, and long-term brand storytelling.",
    overview: [
      "This service is built around careful pre-production and a clear visual plan. Before the shoot, we review the property, intended usage, priority views, sun direction, staging needs, access windows, and the channels where the images will live. The goal is to avoid a generic walk-through gallery and instead create a structured set of images with a clear job: establish the space, explain the design, and give your team usable assets for multiple contexts.",
      "On production day, we work deliberately through exterior views, primary rooms, transitions, amenities, details, and supporting angles. The approach balances architectural precision with a commercial understanding of how images need to perform online. Lines are clean, compositions are intentional, and the final edit is paced so the viewer understands the property rather than just seeing isolated images.",
      "Final delivery includes organized files for full-resolution use, web-ready publishing, selected hero images, and channel-specific crops when needed. Your team receives a cleaner handoff, not a folder of disconnected files."
    ],
    serviceDetails: [
      {
        title: "Architectural storytelling",
        body: "Coverage is planned to show how a space works: arrival, scale, layout, material choices, light, detail, and atmosphere. This gives architects, designers, developers, and hospitality teams a complete visual story instead of a small set of disconnected highlights."
      },
      {
        title: "Interior and exterior coverage",
        body: "Shoots can include exterior establishing views, lobby and common areas, amenity spaces, rooms, workspaces, retail environments, restaurants, residences, detail vignettes, and environmental context. Scope is shaped around the spaces that matter most to the client and the audience."
      },
      {
        title: "Marketing-ready delivery",
        body: "Images are prepared for real-world use across websites, decks, listings, press outreach, social, and internal brand libraries. Delivery can include hero selects, web crops, filenames, basic metadata direction, and a clear folder structure so the assets are easier to publish."
      }
    ],
    bestFor: [
      "Architecture and interior design portfolios",
      "Hospitality, amenity, and retail environments",
      "Commercial properties preparing for leasing or launch",
      "Developers and property teams building long-term image libraries"
    ],
    heroTagline: "Spaces and structures, prepared for real-world use.",
    portfolioLabel: "Architecture Portfolio",
    portfolioHref: "/work/architecture",
    heroImage: "/images/hospitality.jpg",
    proofImages: ["/images/hospitality.jpg", "/images/food.jpg", "/images/hero.jpg"],
    industries: ["Commercial real estate", "Architecture & design", "Hospitality", "Retail & amenity"],
    deliverables: [
      "Hero exterior + interior sets",
      "Detail and context imagery",
      "Web, listing, and print crops",
      "Structured delivery with SEO-aware metadata",
    ],
    process: [
      "Pre-production + shot list aligned to usage",
      "On-site capture with art direction",
      "Proof gallery within 5–7 days",
      "Final delivery: organized files, naming, and platform-ready outputs",
    ],
    pricing: {
      label: "Typical investment",
      range: "$4.5k–$12k",
      disclaimer:
        "Pricing reflects half-day to multi-day coverage and scales with square footage, access, styling, and usage.",
      licensing:
        "Usage includes web, listings, and editorial. Paid media, OOH, and global campaigns are quoted separately.",
    },
    faqs: [
      {
        q: "How long does an architecture shoot take?",
        a: "Most projects book 1–3 production days depending on scope, access, and the number of spaces.",
      },
      {
        q: "Do you work with on-site teams?",
        a: "Yes—facilities, marketing, and design partners coordinate with us to stage and capture each scene.",
      },
      {
        q: "Can you deliver seasonal or phased updates?",
        a: "Yes. We offer refresh packages when spaces evolve or campaigns require new assets.",
      },
    ],
    caseStudies: [
      {
        slug: "hotel-01",
        title: "Harborline Hotel",
        category: "Architecture",
        image: "/work/hotel-01/cover.svg",
        meta: "Jersey City, NJ · 2025",
      },
      {
        slug: "hotel-02",
        title: "Cedar House Resort",
        category: "Architecture",
        image: "/work/hotel-02/cover.svg",
        meta: "Nashville, TN · 2025",
      },
    ],
    caseStudiesEnabled: true,
    caseStudiesIntro: "Explore related projects and outcomes.",
    relatedServicesEnabled: true,
    relatedServicesIntro:
      "Architecture and spaces work often pairs with commercial real estate and campaign photography for full property launches.",
    relatedServicesLinks: [
      { slug: "commercial-real-estate-photography", title: "Commercial Real Estate Photography" },
      { slug: "fashion-campaign-photography", title: "Fashion & Advertising Photography" },
    ],
    showRelatedContactButton: true,
  },
  {
    slug: "commercial-real-estate-photography",
    title: "Commercial Real Estate Photography",
    summary:
      "Strategic property imagery for leasing, investment decks, development marketing, amenities, brokers, and ownership teams.",
    description:
      "Commercial real estate photography designed to help properties feel clear, credible, and premium across leasing campaigns, investor presentations, broker materials, websites, and social channels. The focus is not only on documenting the asset, but on explaining its value: location, scale, finish, amenities, flexibility, and the experience of moving through the space.",
    overview: [
      "A strong commercial real estate image library has to work for multiple audiences at once. Leasing teams need clean hero images and practical space coverage. Ownership and investment teams need polished visuals for decks and updates. Marketing teams need crops and selects that can move quickly across web, email, social, listing platforms, and presentations.",
      "This service starts with the business use case: what is being leased, sold, launched, repositioned, refreshed, or documented. From there, we build a shot plan around the areas that carry the most value, including exterior presence, entry sequence, amenity spaces, office suites, retail frontage, views, circulation, finishes, neighborhood context, and details that help the property stand apart.",
      "Final assets are delivered with a practical structure so brokers, marketing teams, and stakeholders can quickly find the right files without digging through an unorganized export."
    ],
    serviceDetails: [
      {
        title: "Leasing and launch coverage",
        body: "Photography can support new listings, stabilized assets, repositioned spaces, amenity launches, tenant-ready suites, and campaign refreshes. Coverage is shaped around what decision-makers and prospective tenants need to understand quickly."
      },
      {
        title: "Business-focused image planning",
        body: "The shoot plan is tied to the property's commercial goals: visibility, occupancy, perception, investor confidence, broker enablement, or brand consistency. This keeps the final gallery useful beyond a single campaign."
      },
      {
        title: "Asset delivery for teams",
        body: "Final delivery can include full-resolution files, web-ready selects, listing-friendly crops, deck-ready hero images, and organized folders by use case or space. The goal is to make the image library easy for a team to activate."
      }
    ],
    bestFor: [
      "Office, retail, mixed-use, and hospitality properties",
      "Developers, ownership groups, and leasing teams",
      "Brokerage campaigns and investor materials",
      "Amenity, lobby, suite, and exterior refreshes"
    ],
    heroTagline: "Architecture-first visuals for premium leasing.",
    portfolioLabel: "Real Estate Portfolio",
    portfolioHref: "/work/architecture",
    heroImage: "/images/real-estate.jpg",
    proofImages: ["/images/real-estate.jpg", "/images/design.jpg", "/images/hero.jpg"],
    industries: ["Office + mixed-use", "Luxury residential", "Retail + lobby", "Amenity suites"],
    deliverables: [
      "Exterior hero + context shots",
      "Interior suites + amenity sets",
      "Floor-to-ceiling detailing",
      "Investor deck-ready selects + metadata",
    ],
    process: [
      "Site walk + lighting plan",
      "Capture day with staging support",
      "Proofing gallery + selects",
      "Final delivery: web, print, and listing crops with organized structure",
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
    caseStudiesEnabled: true,
    caseStudiesIntro: "Explore related projects and outcomes.",
    relatedServicesEnabled: true,
    relatedServicesIntro:
      "Leasing and investment teams often combine property photography with architecture coverage and campaign assets.",
    relatedServicesLinks: [
      { slug: "architecture-photography", title: "Architecture & Spaces Photography" },
      { slug: "fashion-campaign-photography", title: "Fashion & Advertising Photography" },
    ],
    showRelatedContactButton: true,
  },
  {
    slug: "fashion-campaign-photography",
    title: "Fashion & Advertising Photography",
    summary:
      "Editorial and campaign photography for brands that need polished visuals across lookbooks, ads, ecommerce, launches, and social campaigns.",
    description:
      "Fashion and advertising photography shaped around a brand's campaign goals, audience, product story, and publishing needs. From concept direction through final selects, the work is built to create a flexible visual system for lookbooks, paid and organic campaigns, ecommerce support, social content, press, and launch materials.",
    overview: [
      "Campaign photography needs to hold attention while still serving the practical needs of a marketing team. The images have to feel intentional, on-brand, and polished, but they also need enough range to support multiple placements: hero banners, product moments, social crops, ads, email, press, and internal decks.",
      "This service begins with creative alignment: mood, lighting direction, location or studio needs, styling, talent, product priorities, shot count, and final usage. The production can be lean or more fully built out depending on the campaign, but the process is always designed to give the brand a cohesive image library rather than a scattered set of nice frames.",
      "Retouching, color, sequencing, and delivery are handled with the final channels in mind so the files are easier to use after the shoot. When needed, delivery can include campaign folders, web-ready crops, hero selects, social crops, and guidance for how to organize the visual rollout."
    ],
    serviceDetails: [
      {
        title: "Campaign concept to final selects",
        body: "We translate a campaign direction into a practical production plan: visual mood, shot list, lighting approach, location strategy, talent considerations, and final asset needs. The result is a shoot that feels creatively focused and commercially useful."
      },
      {
        title: "Editorial polish with brand discipline",
        body: "The work balances cinematic lighting and elevated composition with the restraint needed for premium brand communication. Images are built to feel considered, not overproduced or generic."
      },
      {
        title: "Multi-channel delivery",
        body: "Final assets can be organized for lookbooks, web, ecommerce, paid ads, social, email, and press. This makes the image library easier for creative, marketing, and ecommerce teams to use without rebuilding the delivery after the fact."
      }
    ],
    bestFor: [
      "Fashion, lifestyle, and product campaigns",
      "Lookbooks, editorials, and launch stories",
      "Advertising and social-first image libraries",
      "Brands that need polished assets across several channels"
    ],
    heroTagline: "Editorial lighting with campaign-level polish.",
    portfolioLabel: "Fashion Portfolio",
    portfolioHref: "/work/advertising",
    heroImage: "/images/fashion.jpg",
    proofImages: ["/images/fashion.jpg", "/images/hero.jpg", "/images/design.jpg"],
    industries: ["Editorial", "Lookbooks", "Advertising", "Ecommerce"],
    deliverables: [
      "Lookbook hero sets",
      "Campaign close-ups + texture",
      "Studio + location combinations",
      "Social, ecommerce, and ad crops with organized delivery",
    ],
    process: [
      "Concept + moodboard alignment",
      "Styling + production coordination",
      "Capture day with live art direction",
      "Final selects with retouching and channel-ready structure",
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
        a: "Yes—multi-location days are common for advertising and campaign work.",
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
    caseStudiesEnabled: true,
    caseStudiesIntro: "Explore related projects and outcomes.",
    relatedServicesEnabled: true,
    relatedServicesIntro:
      "Campaign teams often pair fashion and advertising work with architecture and commercial property photography.",
    relatedServicesLinks: [
      { slug: "architecture-photography", title: "Architecture & Spaces Photography" },
      { slug: "commercial-real-estate-photography", title: "Commercial Real Estate Photography" },
    ],
    showRelatedContactButton: true,
  },
];
