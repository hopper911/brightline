/**
 * Shared credibility data for consistent use across pages
 */

export const CREDIBILITY = {
  stats: [
    { value: "28+", label: "Brands Served", description: "Hospitality, CRE, fashion" },
    { value: "5/5", label: "Client Satisfaction", description: "Based on project feedback" },
    { value: "48hr", label: "Response Time", description: "Proposal turnaround" },
    { value: "7 day", label: "Proof Delivery", description: "First selects delivered" },
  ],
  
  clients: {
    // Add real client logos when available
    logos: [] as { name: string; src: string; href?: string }[],
    industries: ["Hospitality groups", "Commercial developers", "Fashion brands", "Retail & lifestyle"],
  },
  
  process: [
    {
      step: "01",
      title: "Discovery",
      description: "Share your project scope, timeline, and goals. We respond with a tailored proposal within 48 hours.",
      duration: "1-2 days",
    },
    {
      step: "02",
      title: "Pre-production",
      description: "Shot list, location scout, styling coordination, and scheduling. Everything aligned before we arrive.",
      duration: "3-7 days",
    },
    {
      step: "03",
      title: "Production",
      description: "On-site capture with art direction. We work efficiently to maximize each shooting window.",
      duration: "1-3 days",
    },
    {
      step: "04",
      title: "Post & Delivery",
      description: "Curated proof gallery, retouching, and final delivery with web and print-ready formats.",
      duration: "7-14 days",
    },
  ],
  
  turnaround: {
    proofs: "5-7 business days",
    finals: "10-14 business days",
    rush: "Available for priority projects",
  },
  
  licensing: {
    included: [
      "Web and digital use",
      "Social media",
      "Listing and booking platforms",
      "Editorial coverage",
    ],
    additional: [
      "Paid advertising",
      "Out-of-home (OOH)",
      "Global campaigns",
      "Resale or syndication",
    ],
    note: "All projects include a clear usage agreement. Extended licensing is quoted separately.",
  },
  
  faqs: [
    {
      q: "How do I get started?",
      a: "Submit a project inquiry or check availability. We'll respond within 48 hours with questions and a tailored proposal.",
    },
    {
      q: "What's included in the pricing?",
      a: "Pre-production planning, on-site capture, curated proofing, retouching, and final delivery. Usage licensing is quoted based on scope.",
    },
    {
      q: "Do you travel for shoots?",
      a: "Yes. We're based in New York and Miami but regularly work nationwide and internationally. Travel is quoted separately.",
    },
    {
      q: "How long does a typical project take?",
      a: "From first contact to final delivery, most projects complete in 2-4 weeks. Rush timelines are available.",
    },
    {
      q: "What formats do you deliver?",
      a: "High-resolution files optimized for web, print, and social. We include standard crops and can provide custom sizes.",
    },
    {
      q: "Do you offer retouching?",
      a: "Yes. All projects include color correction and light retouching. Advanced retouching for campaigns is available.",
    },
  ],
} as const;
