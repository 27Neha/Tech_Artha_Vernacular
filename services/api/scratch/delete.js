const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const uid = 'a793116f-9990-4b9f-8154-abc04ae5416f';
  try {
    // 1. fp resources
    const accounts = await prisma.fpMfInvestmentAccount.findMany({ where: { investorProfile: { userId: uid } } });
    for (const a of accounts) {
        await prisma.fpPurchaseOrder.deleteMany({ where: { accountId: a.id } });
        await prisma.fpPurchasePlan.deleteMany({ where: { accountId: a.id } });
        await prisma.fpMandate.deleteMany({ where: { accountId: a.id } });
    }
    await prisma.fpMfInvestmentAccount.deleteMany({ where: { investorProfile: { userId: uid } } });
    await prisma.fpInvestorProfile.deleteMany({ where: { userId: uid } });

    // 2. KYC resources
    const kycApps = await prisma.kYCApplication.findMany({ where: { userId: uid } });
    for (const app of kycApps) {
        await prisma.kYCProviderEvent.deleteMany({ where: { applicationId: app.id } });
        await prisma.kYCVerification.deleteMany({ where: { applicationId: app.id } });
    }
    await prisma.kYCApplication.deleteMany({ where: { userId: uid } });
    
    // 3. Consents
    const consents = await prisma.consent.findMany({ where: { userId: uid } });
    for (const c of consents) {
        await prisma.consentEvent.deleteMany({ where: { consentId: c.id } });
    }
    await prisma.consent.deleteMany({ where: { userId: uid } });

    // 4. Everything else directly linked to user
    const keys = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$') && k !== 'user');
    for (const key of keys) {
      if (typeof prisma[key].deleteMany === 'function') {
        try {
          await prisma[key].deleteMany({ where: { userId: uid } });
        } catch(e) {}
      }
    }
    
    await prisma.user.delete({ where: { id: uid } });
    console.log('Deleted');
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

run();
