import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting DB cleanup... This will delete everything except the admin and categories.');

  try {
    // 1. Delete all transactional / log data
    await prisma.trackingPoint.deleteMany();
    await prisma.orderStatusHistory.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.delivery.deleteMany();
    await prisma.cashCollection.deleteMany();
    await prisma.commission.deleteMany();
    await prisma.order.deleteMany();
    
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.inventoryLog.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.review.deleteMany();
    await prisma.product.deleteMany();

    await prisma.timeSlot.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.serviceOffering.deleteMany();
    await prisma.provider.deleteMany();
    
    // 2. Delete all shop-related data
    await prisma.shopTiming.deleteMany();
    await prisma.shopHoliday.deleteMany();
    await prisma.shopDocument.deleteMany();
    await prisma.commissionRule.deleteMany();
    await prisma.advertisement.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.shopSettlement.deleteMany();
    await prisma.settlementReport.deleteMany();
    await prisma.shop.deleteMany();
    
    // 3. Delete user-related profile data
    await prisma.session.deleteMany();
    await prisma.address.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.deviceToken.deleteMany();
    await prisma.walletTransaction.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.loyaltyTransaction.deleteMany();
    await prisma.loyaltyAccount.deleteMany();
    await prisma.deliveryPartner.deleteMany();
    
    await prisma.expense.deleteMany();
    await prisma.businessLead.deleteMany();
    await prisma.businessStaff.deleteMany();
    await prisma.businessBranch.deleteMany();
    await prisma.business.deleteMany();
    
    await prisma.supportTicket.deleteMany();
    await prisma.fraudLog.deleteMany();
    await prisma.voiceOrderLog.deleteMany();
    await prisma.cashVerification.deleteMany();
    await prisma.cashShortage.deleteMany();
    await prisma.cashReceipt.deleteMany();
    await prisma.riderDeposit.deleteMany();
    await prisma.superAdminAction.deleteMany();
    await prisma.platformReport.deleteMany();
    await prisma.conversationParticipant.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.settlementBatch.deleteMany();
    await prisma.districtAdmin.deleteMany();
    await prisma.marketAdmin.deleteMany();
    
    // 4. Finally, delete all users EXCEPT the admin
    const adminEmail = 'rehansuman41008@gmail.com';
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        email: {
          not: adminEmail
        }
      }
    });

    console.log(`Successfully deleted ${deletedUsers.count} test users.`);
    console.log('Database cleanup completed perfectly. Categories and Admin are preserved.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
