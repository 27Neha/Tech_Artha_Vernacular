const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mobile = '+919309430291';
  const user = await prisma.user.findUnique({ where: { mobile } });
  if (!user) {
    console.log('User not found.');
    return;
  }
  
  const userId = user.id;
  console.log(`Found user ${userId}. Deleting related records...`);

  // We must delete records in the right order or just deleteMany in all possible tables.
  const tables = [
    'session', 'auditLog', 'bseClient', 'device', 'expense',
    'fpMandate', 'goal', 'guardian', 'guardianConsent', 'kycRecord', 'learningProgress',
    'notification', 'onboardingProgress', 'supportTicket', 'userProfile', 'riskAssessment', 'riskProfile'
  ];

  // Delete ConsentEvents first
  const consents = await prisma.consent.findMany({ where: { userId } });
  for (const consent of consents) {
      if (prisma.consentEvent) {
          await prisma.consentEvent.deleteMany({ where: { consentId: consent.id } });
      }
  }
  if (prisma.consent) await prisma.consent.deleteMany({ where: { userId } });
  console.log('Deleted Consents and ConsentEvents');

  for (const table of tables) {
    if (prisma[table]) {
      try {
        if (table === 'guardianConsent') {
            await prisma[table].deleteMany({ where: { minorUserId: userId } });
        } else if (table === 'guardian') {
            await prisma[table].deleteMany({ where: { minorUserId: userId } });
        } else {
            await prisma[table].deleteMany({ where: { userId } });
        }
        console.log(`Deleted from ${table}`);
      } catch (e) {
        console.error(`Error deleting from ${table}:`, e.message);
      }
    }
  }

  // Handle KYCApplication specifically due to nested records (KYCVerification, KYCProviderEvent)
  const kycApp = await prisma.kYCApplication.findUnique({ where: { userId } });
  if (kycApp) {
      if (prisma.kYCVerification) await prisma.kYCVerification.deleteMany({ where: { applicationId: kycApp.id } });
      if (prisma.kYCProviderEvent) await prisma.kYCProviderEvent.deleteMany({ where: { applicationId: kycApp.id } });
      await prisma.kYCApplication.delete({ where: { userId } });
      console.log('Deleted KYCApplication');
  }

  // Handle Portfolio and Holdings
  const portfolio = await prisma.portfolio.findUnique({ where: { userId } });
  if (portfolio) {
      if (prisma.holding) await prisma.holding.deleteMany({ where: { portfolioId: portfolio.id } });
      await prisma.portfolio.delete({ where: { userId } });
      console.log('Deleted Portfolio');
  }

  // Handle FPInvestorProfile and related FpMfInvestmentAccount etc.
  const fpProfile = await prisma.fpInvestorProfile.findUnique({ where: { userId } });
  if (fpProfile) {
      const accounts = await prisma.fpMfInvestmentAccount.findMany({ where: { investorProfileId: fpProfile.id } });
      for (const acc of accounts) {
         if (prisma.fpPurchaseOrder) await prisma.fpPurchaseOrder.deleteMany({ where: { accountId: acc.id } });
         if (prisma.fpPurchasePlan) await prisma.fpPurchasePlan.deleteMany({ where: { accountId: acc.id } });
      }
      if (prisma.fpMfInvestmentAccount) await prisma.fpMfInvestmentAccount.deleteMany({ where: { investorProfileId: fpProfile.id } });
      await prisma.fpInvestorProfile.delete({ where: { userId } });
      console.log('Deleted FpInvestorProfile');
  }

  try {
    await prisma.$executeRawUnsafe('DELETE FROM "MinorRiskAssessment" WHERE "userId" = $1', userId);
    await prisma.$executeRawUnsafe('DELETE FROM "MinorInvestorProfileResult" WHERE "userId" = $1', userId);
  } catch (e) {
    console.log("No deprecated minor tables to delete, or error:", e.message);
  }

  try {
    await prisma.user.delete({ where: { id: userId } });
    console.log('User deleted successfully.');
  } catch (e) {
    console.error('Failed to delete user:', e.message);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
