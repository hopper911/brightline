export type TestimonialEntry = {
  quote: string;
  name: string;
  role?: string;
  company?: string;
};

export const TESTIMONIALS: TestimonialEntry[] = [
  {
    quote:
      "Bright Line understands how to make a space feel alive. We booked out our new suites within two weeks.",
    name: "Elena Marquis",
    role: "Director, Maison Delmar",
  },
  {
    quote:
      "They came with a visual narrative, not just a shot list. The campaign felt elevated from day one.",
    name: "Noah Kim",
    role: "Creative Lead, Meridian Studio",
  },
];
