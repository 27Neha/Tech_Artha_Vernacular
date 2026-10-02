const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.log('No users found in the database.');
    return;
  }
  
  console.log(`Found ${users.length} users. Deleting...`);

  const tables = [
    'session', 'auditLog', 'bseClient', 'device', 'expense',
    'fpMandate', 'goal', 'guardian', 'guardianConsent', 'kycRecord', 'learningProgress',
    'notification', 'onboardingProgress', 'supportTicket', 'userProfile', 'riskAssessment', 'riskProfile',
    'customBucket'
  ];

  for (const user of users) {
    const userId = user.id;
    console.log(`Deleting data for user ${userId}...`);

    // Consents
    const consents = await prisma.consent.findMany({ where: { userId } });
    for (const consent of consents) {
        if (prisma.consentEvent) await prisma.consentEvent.deleteMany({ where: { consentId: consent.id } });
    }
    if (prisma.consent) await prisma.consent.deleteMany({ where: { userId } });

    for (const table of tables) {
      if (prisma[table]) {
        try {
          if (table === 'guardianConsent' || table === 'guardian') {
              await prisma[table].deleteMany({ where: { minorUserId: userId } });
          } else {
              await prisma[table].deleteMany({ where: { userId } });
          }
        } catch (e) {
        }
      }
    }

    // KYC
    if (prisma.kYCApplication) {
        const kycApp = await prisma.kYCApplication.findUnique({ where: { userId } });
        if (kycApp) {
            if (prisma.kYCVerification) await prisma.kYCVerification.deleteMany({ where: { applicationId: kycApp.id } });
            if (prisma.kYCProviderEvent) await prisma.kYCProviderEvent.deleteMany({ where: { applicationId: kycApp.id } });
            await prisma.kYCApplication.delete({ where: { userId } });
        }
    }

    // Portfolio
    if (prisma.portfolio) {
        const portfolio = await prisma.portfolio.findUnique({ where: { userId } });
        if (portfolio) {
            if (prisma.holding) await prisma.holding.deleteMany({ where: { portfolioId: portfolio.id } });
            await prisma.portfolio.delete({ where: { userId } });
        }
    }

    // FPInvestorProfile
    if (prisma.fpInvestorProfile) {
        const fpProfile = await prisma.fpInvestorProfile.findUnique({ where: { userId } });
        if (fpProfile) {
            if (prisma.fpMfInvestmentAccount) {
                const accounts = await prisma.fpMfInvestmentAccount.findMany({ where: { investorProfileId: fpProfile.id } });
                for (const acc of accounts) {
                   if (prisma.fpPurchaseOrder) await prisma.fpPurchaseOrder.deleteMany({ where: { accountId: acc.id } });
                   if (prisma.fpPurchasePlan) await prisma.fpPurchasePlan.deleteMany({ where: { accountId: acc.id } });
                }
                await prisma.fpMfInvestmentAccount.deleteMany({ where: { investorProfileId: fpProfile.id } });
            }
            await prisma.fpInvestorProfile.delete({ where: { userId } });
        }
    }

    try {
      await prisma.$executeRawUnsafe('DELETE FROM "MinorRiskAssessment" WHERE "userId" = $1', userId);
      await prisma.$executeRawUnsafe('DELETE FROM "MinorInvestorProfileResult" WHERE "userId" = $1', userId);
    } catch (e) {}

    // Finally delete user
    try {
      await prisma.user.delete({ where: { id: userId } });
      console.log(`Successfully deleted user ${userId}`);
    } catch (e) {
      console.error(`Failed to delete user ${userId}:`, e.message);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
