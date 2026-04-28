import { PrismaClient } from "@prisma/client";

import { ensureReferenceData } from "../src/modules/shared/infrastructure/reference-data";

const prisma = new PrismaClient();

async function main() {
  await ensureReferenceData(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
