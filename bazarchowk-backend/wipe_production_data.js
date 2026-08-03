/**
 * BazarChowk — Production Data Wipe Script
 * Deletes ALL transactional/shop/rider data.
 * Preserves: Users with role ADMIN or SUPER_ADMIN, Categories, AdPlans, Markets, Cities.
 */

const { PrismaClient } = require('./node_modules/@prisma/client');
require('dotenv/config');
const prisma = new PrismaClient();

async function wipeProductionData() {
  console.log('🔴 Starting production data wipe...\n');
  console.log('This will delete all shops, riders, orders, products, appointments, etc.');
  console.log('ADMIN and SUPER_ADMIN accounts will be preserved.\n');

  // ── 1. Leaf-level records (no dependencies) ──────────────────────────────
  console.log('Step 1/12: Wiping appointments & time slots...');
  await prisma.appointment.deleteMany({});
  await prisma.timeSlot.deleteMany({});
  await prisma.provider.deleteMany({});
  await prisma.serviceOffering.deleteMany({});

  console.log('Step 2/12: Wiping deliveries & tracking...');
  await prisma.trackingPoint.deleteMany({});
  await prisma.delivery.deleteMany({});
  await prisma.deliveryPartner.deleteMany({});

  console.log('Step 3/12: Wiping orders & payments...');
  await prisma.orderStatusHistory.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.order.deleteMany({});

  console.log('Step 4/12: Wiping cart...');
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});

  console.log('Step 5/12: Wiping reviews...');
  await prisma.review.deleteMany({});

  console.log('Step 6/12: Wiping inventory & products...');
  await prisma.inventoryLog.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});

  console.log('Step 7/12: Wiping shop data...');
  await prisma.shopDocument.deleteMany({});
  await prisma.shopHoliday.deleteMany({});
  await prisma.shopTiming.deleteMany({});
  await prisma.advertisement.deleteMany({});
  await prisma.shop.deleteMany({});

  console.log('Step 8/12: Wiping wallet & loyalty...');
  await prisma.loyaltyTransaction.deleteMany({});
  await prisma.loyaltyAccount.deleteMany({});
  await prisma.walletTransaction.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.referral.deleteMany({});

  console.log('Step 9/12: Wiping settlements & finance...');
  try {
    await prisma.settlement.deleteMany({});
    await prisma.commission.deleteMany({});
    await prisma.financeTransaction.deleteMany({});
    await prisma.financeAccount.deleteMany({});
    await prisma.expense.deleteMany({});
  } catch(e) { console.warn('  Some finance tables skipped (may not exist):', e.message); }

  console.log('Step 10/12: Wiping business profiles...');
  try {
    await prisma.businessAuditLog.deleteMany({});
    await prisma.businessSubscription.deleteMany({});
    await prisma.businessLead.deleteMany({});
    await prisma.businessStaff.deleteMany({});
    await prisma.businessBank.deleteMany({});
    await prisma.businessLocation.deleteMany({});
    await prisma.businessVerification.deleteMany({});
    await prisma.businessDocument.deleteMany({});
    await prisma.businessBranch.deleteMany({});
    await prisma.businessProfile.deleteMany({});
    await prisma.business.deleteMany({});
  } catch(e) { console.warn('  Some business tables skipped:', e.message); }

  console.log('Step 11/12: Wiping support, notifications, sessions, audit logs...');
  try { await prisma.supportTicketMessage.deleteMany({}); } catch(e) {}
  try { await prisma.supportTicket.deleteMany({}); } catch(e) {}
  try { await prisma.auditLog.deleteMany({}); } catch(e) {}
  try { await prisma.activityLog.deleteMany({}); } catch(e) {}
  try { await prisma.cashVerification.deleteMany({}); } catch(e) {}
  await prisma.notification.deleteMany({});
  await prisma.deviceToken.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.address.deleteMany({});

  console.log('Step 12/12: Deleting non-admin users...');
  // Keep only ADMIN and SUPER_ADMIN roles
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      role: {
        notIn: ['ADMIN', 'SUPER_ADMIN']
      }
    }
  });
  console.log(`  Deleted ${deletedUsers.count} non-admin users.`);

  // ── Verify what remains ──────────────────────────────────────────────────
  const remainingUsers = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, role: true }
  });

  console.log('\n✅ WIPE COMPLETE!\n');
  console.log('─────────────────────────────────────────────');
  console.log('Remaining admin accounts:');
  remainingUsers.forEach(u => {
    console.log(`  • [${u.role}] ${u.firstName || 'N/A'} — ${u.email}`);
  });
  console.log('─────────────────────────────────────────────');
  console.log('\nDatabase is now blank and ready for real launch. 🚀');
}

wipeProductionData()
  .catch(err => {
    console.error('\n❌ Error during wipe:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
