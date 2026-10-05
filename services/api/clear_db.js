const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing all users and related data...');
  
  await prisma.session.deleteMany({});
  await prisma.onboardingProgress.deleteMany({});
  await prisma.otpVerification.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.device.deleteMany({});
  await prisma.user.deleteMany({});
  
  console.log('Database cleared completely!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
