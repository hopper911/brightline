/**
 * Seed six Design & Digital draft projects (published: false).
 * Safe to re-run: upserts by slug.
 *
 *   npx tsx scripts/seed-design-portfolio-drafts.ts
 */
import { PrismaClient, DesignPortfolioStatus } from "@prisma/client";

const prisma = new PrismaClient();

type Seed = {
  slug: string;
  title: string;
  summary: string;
  problemStatement: string;
  status: DesignPortfolioStatus;
  disciplines: string[];
  year: number;
  role: string;
  platformLabel: string;
  toolsLabel: string;
  industryLabel: string;
  projectTypeLabel: string;
  timelineLabel: string;
  featured: boolean;
  sortOrder: number;
  caseStudy: Record<string, string>;
};

const SEEDS: Seed[] = [
  {
    slug: "brightline-studio-os",
    title: "Brightline Studio OS",
    summary:
      "A modular operating system for managing the full lifecycle of a commercial photography business.",
    problemStatement:
      "Creative businesses often run leads, contracts, schedules, tasks, invoices, and asset delivery across disconnected tools.",
    status: "INTERNAL_TOOL",
    disciplines: ["product", "ux-ui", "ai-automation", "digital"],
    year: 2025,
    role: "Product design, UX/UI, architecture, implementation",
    platformLabel: "Web application",
    toolsLabel: "Next.js, Prisma, Neon, Cloudflare R2, Vercel",
    industryLabel: "Creative services",
    projectTypeLabel: "Internal business system",
    timelineLabel: "Ongoing",
    featured: true,
    sortOrder: 10,
    caseStudy: {
      overview:
        "Studio OS (Mission Control) centralizes studio operations: leads, projects, tasks, calendar, contracts, invoices, client delivery, galleries, and accountant access—without pretending to be enterprise software.",
      goals:
        "Reduce tool fragmentation\nSpeed up day-to-day data entry\nKeep role-based access clear\nSupport mobile use for field production\nConnect delivery and finance to project context",
      responsibilities:
        "Product strategy\nInformation architecture\nUI design\nTechnical architecture\nImplementation\nIteration from real studio use",
      technicalApproach:
        "Next.js App Router, Prisma/Postgres, cookie-based admin auth, R2 media, modular admin and studio surfaces already running in production for Brightline.",
      outcomes:
        "Internal tool in active use for Brightline operations. Intended outcome: fewer disconnected tools and clearer project handoffs.",
      nextSteps:
        "Continue refining workflows from production use. Expand case-study visuals as stable screens are captured.",
      challenges:
        "Balancing breadth of modules with operational clarity\nAvoiding enterprise complexity while covering real studio needs",
    },
  },
  {
    slug: "restaurant-scheduling-platform",
    title: "AI Restaurant Scheduling Platform",
    summary:
      "An AI-assisted workforce scheduling concept designed around restaurant operations realities—not generic calendar software.",
    problemStatement:
      "Restaurant scheduling must balance availability, roles, labor targets, volume, callouts, and fairness—generic tools still require heavy manual adjustment.",
    status: "PRODUCT_CONCEPT",
    disciplines: ["product", "ux-ui", "ai-automation"],
    year: 2025,
    role: "Product design, UX, workflow definition",
    platformLabel: "Web + mobile concepts",
    toolsLabel: "Figma / product specs",
    industryLabel: "Hospitality / restaurants",
    projectTypeLabel: "Product concept",
    timelineLabel: "Concept",
    featured: true,
    sortOrder: 20,
    caseStudy: {
      overview:
        "A scheduling platform concept that treats AI as an explainable assistant: constraints, recommendations, overrides, and manager approval—not a black-box generate button.",
      goals:
        "Reduce weekly schedule assembly time\nSurface conflicts before publish\nKeep labor visibility clear\nSupport callout replacement flows",
      responsibilities: "Product strategy\nResearch from hospitality operations\nUX flows\nInterface structure",
      outcomes:
        "Product concept / interactive prototype stage. No claim of production deployment.",
      nextSteps: "Prototype key flows: weekly grid, forecast panel, callout replacement, approval.",
      challenges:
        "Keeping AI recommendations explainable\nRespecting fair scheduling and overtime constraints",
    },
  },
  {
    slug: "brightline-client-portal",
    title: "Brightline Client Portal",
    summary:
      "A client-facing asset platform that turns photography delivery into an organized, usable brand library.",
    problemStatement:
      "Commercial delivery often leaves clients with unclear proofing, disorganized folders, confusing downloads, and no clear approval trail.",
    status: "LIVE_PRODUCT",
    disciplines: ["ux-ui", "web", "product", "digital"],
    year: 2025,
    role: "UX/UI, product design, implementation",
    platformLabel: "Web application",
    toolsLabel: "Next.js, R2, signed access, galleries",
    industryLabel: "Commercial photography",
    projectTypeLabel: "Client experience / DAM",
    timelineLabel: "Live / ongoing",
    featured: true,
    sortOrder: 30,
    caseStudy: {
      overview:
        "Secure client access for galleries, selections, downloads, and delivery packages—built into Brightline’s production stack.",
      goals:
        "Clear proofing and selection\nReliable downloads\nSecure access codes\nFewer repeated client questions",
      responsibilities: "UX/UI\nAccess model\nGallery and package flows\nImplementation with existing media systems",
      technicalApproach:
        "HMAC client sessions, R2 storage with prefix policy, delivery packages, favorites/selections, and admin publishing tools.",
      outcomes:
        "Live product used for client gallery and package delivery. Operational benefit: structured handoff instead of ad-hoc file shares.",
      nextSteps: "Continue refining mobile gallery UX and delivery clarity.",
    },
  },
  {
    slug: "collaborative-travel-companion",
    title: "Collaborative Travel Companion",
    summary:
      "A mobile coordination concept that gathers itineraries, documents, maps, and group communication into one shared trip experience.",
    problemStatement:
      "Group travel information is usually scattered across messages, spreadsheets, bookings, and photo albums.",
    status: "PRODUCT_CONCEPT",
    disciplines: ["product", "ux-ui"],
    year: 2024,
    role: "Product / UX concept",
    platformLabel: "Mobile concept",
    toolsLabel: "Design / product specs",
    industryLabel: "Travel",
    projectTypeLabel: "Product concept",
    timelineLabel: "Concept",
    featured: false,
    sortOrder: 40,
    caseStudy: {
      overview:
        "Focuses on three journeys: import a pre-planned itinerary, coordinate a day with the group, and share location/media during the trip.",
      outcomes: "Product concept / interactive prototype stage.",
      nextSteps: "Prioritize itinerary import and day-coordination flows for a clickable prototype.",
    },
  },
  {
    slug: "platform-preview-generator",
    title: "Platform Preview Generator",
    summary:
      "An automated creative-preview concept that shows how campaign assets will appear across real publishing environments.",
    problemStatement:
      "Clients struggle to evaluate campaign assets without seeing them in platform-native layouts.",
    status: "PRODUCT_CONCEPT",
    disciplines: ["product", "web", "ai-automation", "graphic"],
    year: 2025,
    role: "Product concept / creative technology",
    platformLabel: "Web tool concept",
    toolsLabel: "Browser automation concepts, templates",
    industryLabel: "Marketing / creative",
    projectTypeLabel: "Product concept",
    timelineLabel: "Concept",
    featured: false,
    sortOrder: 50,
    caseStudy: {
      overview:
        "Upload assets, select platforms, generate accurate preview layouts, and export presentation-ready screenshots into a client project.",
      outcomes: "Product concept stage—not a launched commercial product.",
      nextSteps: "Define MVP around Instagram and LinkedIn feed previews with export.",
    },
  },
  {
    slug: "slotfiller",
    title: "SlotFiller",
    summary:
      "A targeted outreach concept for recovering revenue from last-minute appointment cancellations.",
    problemStatement:
      "Appointment businesses lose revenue when cancellations leave open slots that are hard to refill quickly.",
    status: "PRODUCT_CONCEPT",
    disciplines: ["product", "ai-automation", "web"],
    year: 2024,
    role: "Product concept",
    platformLabel: "SaaS concept",
    toolsLabel: "Product specs",
    industryLabel: "Salons / wellness / appointments",
    projectTypeLabel: "Product concept",
    timelineLabel: "Concept",
    featured: false,
    sortOrder: 60,
    caseStudy: {
      overview:
        "Cancellation creates availability → matching customers → offer/campaign → booking → recovered revenue tracking.",
      outcomes: "Product concept stage.",
      nextSteps: "Validate audience rules and SMS/email preview flows before build.",
    },
  },
];

async function main() {
  for (const seed of SEEDS) {
    await prisma.designProject.upsert({
      where: { slug: seed.slug },
      create: {
        title: seed.title,
        slug: seed.slug,
        summary: seed.summary,
        problemStatement: seed.problemStatement,
        brief: seed.caseStudy.overview ?? seed.summary,
        approach: seed.caseStudy.technicalApproach ?? null,
        outcome: seed.caseStudy.outcomes ?? null,
        status: seed.status,
        disciplines: seed.disciplines,
        year: seed.year,
        role: seed.role,
        platformLabel: seed.platformLabel,
        toolsLabel: seed.toolsLabel,
        industryLabel: seed.industryLabel,
        projectTypeLabel: seed.projectTypeLabel,
        timelineLabel: seed.timelineLabel,
        featured: seed.featured,
        sortOrder: seed.sortOrder,
        published: false,
        caseStudy: seed.caseStudy,
        specimenBlocks: [],
      },
      update: {
        title: seed.title,
        summary: seed.summary,
        problemStatement: seed.problemStatement,
        brief: seed.caseStudy.overview ?? seed.summary,
        approach: seed.caseStudy.technicalApproach ?? null,
        outcome: seed.caseStudy.outcomes ?? null,
        status: seed.status,
        disciplines: seed.disciplines,
        year: seed.year,
        role: seed.role,
        platformLabel: seed.platformLabel,
        toolsLabel: seed.toolsLabel,
        industryLabel: seed.industryLabel,
        projectTypeLabel: seed.projectTypeLabel,
        timelineLabel: seed.timelineLabel,
        featured: seed.featured,
        sortOrder: seed.sortOrder,
        // Never force-publish on re-seed
        caseStudy: seed.caseStudy,
      },
    });
    console.log(`upserted draft: ${seed.slug}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
