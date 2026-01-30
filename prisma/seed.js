const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function ensureTag(name, slug) {
  return prisma.tag.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  });
}

async function ensureClient(name, data = {}) {
  const existing = await prisma.client.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.client.create({ data: { name, ...data } });
}

async function ensureProject({
  title,
  slug,
  category,
  coverUrl,
  year,
  location,
  clientId,
  tagIds = [],
  images = [],
}) {
  const existing = await prisma.project.findUnique({ where: { slug } });
  if (existing) return existing;

  return prisma.project.create({
    data: {
      title,
      slug,
      category,
      year,
      location,
      coverUrl,
      published: true,
      clientId,
      tags: tagIds.length
        ? { create: tagIds.map((tagId) => ({ tagId })) }
        : undefined,
      images: images.length
        ? {
            create: images.map((img, index) => ({
              url: img.url,
              alt: img.alt || null,
              sortOrder: index,
            })),
          }
        : undefined,
    },
  });
}

async function ensureGallery({
  title,
  slug,
  description,
  coverUrl,
  clientId,
  projectId,
  images = [],
}) {
  const existing = await prisma.gallery.findUnique({ where: { slug } });
  if (existing) return existing;

  return prisma.gallery.create({
    data: {
      title,
      slug,
      description,
      coverUrl,
      published: true,
      clientId,
      projectId,
      images: images.length
        ? {
            create: images.map((img, index) => ({
              url: img.url,
              alt: img.alt || null,
              sortOrder: index,
            })),
          }
        : undefined,
    },
  });
}

async function ensureGalleryToken(galleryId, token) {
  const existing = await prisma.galleryAccessToken.findUnique({
    where: { token },
  });
  if (existing) return existing;
  return prisma.galleryAccessToken.create({
    data: { token, galleryId },
  });
}

async function ensureTestimonial({ name, quote, role, company, projectId }) {
  const existing = await prisma.testimonial.findFirst({
    where: { name, quote },
  });
  if (existing) return existing;

  return prisma.testimonial.create({
    data: {
      name,
      quote,
      role: role || null,
      company: company || null,
      projectId: projectId || null,
      published: true,
    },
  });
}

async function main() {
  const hospitality = await ensureTag("Hospitality", "hospitality");
  const realEstate = await ensureTag("Real Estate", "real-estate");
  const fashion = await ensureTag("Fashion", "fashion");

  const atlas = await ensureClient("Atlas Hospitality Group", {
    website: "https://example.com",
    email: "hello@example.com",
  });

  const centralHotel = await ensureProject({
    title: "Central Hotel Renovation",
    slug: "central-hotel-renovation",
    category: "Hospitality",
    year: "2024",
    location: "New York, NY",
    coverUrl: "/images/hospitality.jpg",
    clientId: atlas.id,
    tagIds: [hospitality.id],
    images: [
      { url: "/images/hospitality.jpg", alt: "Central Hotel lobby" },
      { url: "/images/hero.jpg", alt: "Suite interior" },
    ],
  });

  const skyline = await ensureProject({
    title: "Skyline Penthouse",
    slug: "skyline-penthouse",
    category: "Commercial Real Estate",
    year: "2024",
    location: "Brooklyn, NY",
    coverUrl: "/images/real-estate.jpg",
    clientId: atlas.id,
    tagIds: [realEstate.id],
    images: [
      { url: "/images/real-estate.jpg", alt: "Penthouse interior" },
    ],
  });

  const atelier = await ensureProject({
    title: "Atelier Campaign",
    slug: "atelier-campaign",
    category: "Fashion",
    year: "2023",
    location: "SoHo, NY",
    coverUrl: "/images/fashion.jpg",
    clientId: atlas.id,
    tagIds: [fashion.id],
    images: [
      { url: "/images/fashion.jpg", alt: "Editorial fashion set" },
    ],
  });

  await ensureTestimonial({
    name: "Maya Patel",
    role: "Marketing Director",
    company: "Atlas Hospitality",
    quote:
      "Bright Line delivered polished imagery that lifted our brand across every channel.",
    projectId: centralHotel.id,
  });

  await ensureGallery({
    title: "Central Hotel Proof Gallery",
    slug: "central-hotel-proof",
    description: "Proofing gallery for the Central Hotel project.",
    coverUrl: "/images/hospitality.jpg",
    clientId: atlas.id,
    projectId: centralHotel.id,
    images: [
      { url: "/images/hospitality.jpg", alt: "Lobby" },
      { url: "/images/hero.jpg", alt: "Suite" },
    ],
  });

  const gallery = await prisma.gallery.findUnique({
    where: { slug: "central-hotel-proof" },
  });

  if (gallery) {
    await ensureGalleryToken(gallery.id, "BRIGHTLINE-DEMO");
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
