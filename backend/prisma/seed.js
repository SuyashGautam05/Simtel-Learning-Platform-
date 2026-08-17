/* eslint-disable no-console */
/**
 * Simtel Learning Platform — Seed Script
 * -----------------------------------------------------------------
 * Seeds are IDEMPOTENT (safe to re-run): every write uses upsert or
 * findFirst-guarded create, keyed on a natural unique field.
 *
 * Required environment variables (see backend/.env.example):
 *   SUPER_ADMIN_NAME
 *   SUPER_ADMIN_EMAIL
 *   SUPER_ADMIN_PASSWORD   <- never hardcoded; script fails loudly if unset
 *   PRODUCT_KEY_PEPPER     <- required to generate/hash the demo product key
 * -----------------------------------------------------------------
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { generateProductKey, hashProductKey, lastFour } = require("../src/utils/productKeyCrypto");

const prisma = new PrismaClient();

const MODULES = [
  { code: "ELEC", name: "Electrical Engineering", description: "Core electrical engineering fundamentals and circuit analysis." },
  { code: "DIGI", name: "Digital Electronics", description: "Combinational and sequential digital logic design." },
  { code: "ANLG", name: "Analog Electronics", description: "Analog circuit theory, amplifiers, and signal conditioning." },
  { code: "EMB", name: "Embedded Systems", description: "Microcontroller-based embedded systems design." },
  { code: "DSP", name: "DSP", description: "Digital signal processing theory and applications." },
  { code: "COMM", name: "Communication Systems", description: "Analog and digital communication systems." },
  { code: "FIBR", name: "Fiber Optics", description: "Optical fiber communication principles." },
  { code: "WLES", name: "Wireless Communication", description: "Wireless communication systems and protocols." },
  { code: "RFMW", name: "RF & Microwave", description: "RF and microwave engineering." },
  { code: "ANTR", name: "Antenna & RADAR", description: "Antenna theory and RADAR systems." },
  { code: "PLC", name: "PLC & Industrial Automation", description: "Programmable Logic Controllers and industrial automation." },
  { code: "VFD", name: "VFD", description: "Variable Frequency Drives." },
  { code: "MCU", name: "Microcontrollers", description: "Microcontroller architecture and programming." },
  { code: "CNET", name: "Computer Networks", description: "Networking fundamentals and protocols." },
  { code: "IOT", name: "IoT", description: "Internet of Things systems and protocols." },
];

function assertEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". Set it in backend/.env before seeding.`
    );
  }
  return value;
}

async function seedSuperAdmin() {
  const name = process.env.SUPER_ADMIN_NAME || "Platform Owner";
  const email = assertEnv("SUPER_ADMIN_EMAIL");
  const password = assertEnv("SUPER_ADMIN_PASSWORD");

  const passwordHash = await bcrypt.hash(password, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name,
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  console.log(`Super admin ready: ${superAdmin.email}`);
  return superAdmin;
}

async function seedProducts() {
  const products = [];
  for (const mod of MODULES) {
    const product = await prisma.product.upsert({
      where: { code: mod.code },
      update: { name: mod.name, description: mod.description },
      create: { ...mod, status: "ACTIVE" },
    });
    products.push(product);
  }
  console.log(`Seeded ${products.length} products/modules.`);
  return products;
}

async function seedDemoCollege() {
  const college = await prisma.college.upsert({
    where: { code: "LNCT-BPL" },
    update: {},
    create: {
      name: "LNCT Group of Colleges, Bhopal",
      code: "LNCT-BPL",
      email: "admin@lnct-demo.edu",
      phone: "+91-9999999999",
      address: "Bhopal, Madhya Pradesh, India",
      status: "ACTIVE",
    },
  });
  console.log(`Demo college ready: ${college.code}`);
  return college;
}

async function seedDemoCollegeAdmin(college) {
  const email = "admin@lnct-demo.edu";
  const passwordHash = await bcrypt.hash("Demo@College123", 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Demo College Admin",
      email,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      collegeId: college.id,
    },
  });
  console.log(`Demo college admin ready: ${admin.email} (password: Demo@College123)`);
  return admin;
}

async function seedDemoStudent(college) {
  const email = "student@lnct-demo.edu";
  const passwordHash = await bcrypt.hash("Demo@Student123", 12);

  const student = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Demo Student",
      email,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
      collegeId: college.id,
    },
  });
  console.log(`Demo student ready: ${student.email} (password: Demo@Student123)`);
  return student;
}

/**
 * Demonstrates the core business rule end-to-end:
 * a PLC key unlocks ONLY PLC — not Electrical, Embedded, DSP, etc.
 */
async function seedDemoProductKeyAndAccess({ superAdmin, college, student, products }) {
  const plcProduct = products.find((p) => p.code === "PLC");

  const existingKey = await prisma.productKey.findFirst({
    where: { productId: plcProduct.id, collegeId: college.id, activatedByUserId: student.id },
  });
  if (existingKey) {
    console.log("Demo PLC key/access already seeded, skipping.");
    return;
  }

  const rawKey = generateProductKey(plcProduct.code);
  const plcKey = await prisma.productKey.create({
    data: {
      keyHash: hashProductKey(rawKey),
      keyLastFour: lastFour(rawKey),
      productId: plcProduct.id,
      collegeId: college.id,
      generatedByUserId: superAdmin.id,
      maxActivations: 1,
      activationsCount: 1,
      status: "ACTIVE",
      activatedAt: new Date(),
      activatedByUserId: student.id,
    },
  });

  await prisma.userProductAccess.create({
    data: {
      userId: student.id,
      productId: plcProduct.id,
      productKeyId: plcKey.id,
      status: "ACTIVE",
    },
  });

  console.log(
    `Demo PLC key ${rawKey} activated for ${student.email} (this is the ONLY time the raw ` +
      `value is ever printed — it is not stored). ` +
      `They can access PLC only — Electrical/Embedded/DSP remain locked until ` +
      `separate keys are issued and activated for those products.`
  );

  // Also demonstrate a college-level bulk license (unused seats) for Electrical.
  const elecProduct = products.find((p) => p.code === "ELEC");
  await prisma.collegeProductLicense.upsert({
    where: { collegeId_productId: { collegeId: college.id, productId: elecProduct.id } },
    update: {},
    create: {
      collegeId: college.id,
      productId: elecProduct.id,
      totalSeats: 60,
      usedSeats: 0,
      status: "ACTIVE",
    },
  });
  console.log(`Demo college-wide Electrical license seeded (60 seats, 0 used).`);

  // A second, still-UNUSED PLC key so you can immediately test
  // POST /api/product-keys/activate without generating one first.
  const existingSpare = await prisma.productKey.findFirst({
    where: { productId: plcProduct.id, collegeId: college.id, status: "UNUSED" },
  });
  if (existingSpare) {
    console.log("Spare UNUSED PLC key already seeded — raw value was only shown on first run.");
  } else {
    const spareRawKey = generateProductKey(plcProduct.code);
    await prisma.productKey.create({
      data: {
        keyHash: hashProductKey(spareRawKey),
        keyLastFour: lastFour(spareRawKey),
        productId: plcProduct.id,
        collegeId: college.id,
        generatedByUserId: superAdmin.id,
        maxActivations: 1,
        status: "UNUSED",
      },
    });
    console.log(`Spare UNUSED PLC key for testing activation: ${spareRawKey}`);
  }
}

async function main() {
  console.log("Seeding Simtel Learning Platform database...\n");

  const superAdmin = await seedSuperAdmin();
  const products = await seedProducts();
  const college = await seedDemoCollege();
  await seedDemoCollegeAdmin(college);
  const student = await seedDemoStudent(college);
  await seedDemoProductKeyAndAccess({ superAdmin, college, student, products });

  console.log("\nSeed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });