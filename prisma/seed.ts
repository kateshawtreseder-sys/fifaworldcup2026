// Seeds the 48 teams and the 72 group-stage fixtures. Run with `npm run seed`.
import { PrismaClient } from "@prisma/client";
import { seedTeamsAndFixtures } from "../src/lib/seed";

const prisma = new PrismaClient();

seedTeamsAndFixtures(prisma)
  .then((r) => console.log(`Done. Teams: ${r.teams}, group fixtures: ${r.fixtures}.`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
