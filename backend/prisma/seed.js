/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const MODULES = [
  { code: "ELEC", name: "Electrical Engineering" },
  { code: "DIGI", name: "Digital Electronics" },
  { code: "ANLG", name: "Analog Electronics" },
  { code: "EMB", name: "Embedded Systems" },
  { code: "DSP", name: "DSP" },
  { code: "COMM", name: "Communication Systems" },
  { code: "FIBR", name: "Fiber Optics" },
  { code: "WLES", name: "Wireless Communication" },
  { code: "RFMW", name: "RF & Microwave" },
  { code: "ANTR", name: "Antenna & RADAR" },
  { code: "PLC", name: "PLC & Industrial Automation" },
  { code: "VFD", name: "VFD" },
  { code: "MCU", name: "Microcontrollers" },
  { code: "CNET", name: "Computer Networks" },
  { code: "IOT", name: "IoT" },
];

async function main() {
  console.log("Seeding products...");
  for (const mod of MODULES) {
    await prisma.product.upsert({
      where: { code: mod.code },
      update: {},
      create: mod,
    });
  }

  console.log("Seeding super admin...");
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
  await prisma.user.upsert({
    where: { email: "superadmin@simtel.com" },
    update: {},
    create: {
      name: "Platform Owner",
      email: "superadmin@simtel.com",
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("Seed complete. Super admin login: superadmin@simtel.com / ChangeMe123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
