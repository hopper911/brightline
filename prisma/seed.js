/* eslint-disable @typescript-eslint/no-require-imports -- Prisma seed is CommonJS */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.contactMessage.createMany({
    data: [
      {
        name: "Avery Collins",
        email: "avery@example.com",
        message: "Interested in a commercial shoot for our new mixed-use tower.",
      },
      {
        name: "Jordan Lee",
        email: "jordan@example.com",
        message: "We need hospitality imagery for a boutique hotel opening in May.",
      },
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
