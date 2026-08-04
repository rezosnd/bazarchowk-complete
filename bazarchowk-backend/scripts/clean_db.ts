import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanDatabase() {
  console.log('Starting database cleanup...');

  try {
    // 1. Delete all conversational & logging data
    console.log('Deleting logs and conversations...');
    await prisma.message.deleteMany({});
    await prisma.conversationParticipant.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.trackingPoint.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.deviceToken.deleteMany({});
    await prisma.session.deleteMany({});

    // 2. Delete all Orders and related data
    console.log('Deleting orders and payments...');
    await prisma.payment.deleteMany({});
    await prisma.delivery.deleteMany({});
    await prisma.orderStatusHistory.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.settlementItem.deleteMany({});
    await prisma.cashCollection.deleteMany({});
    await prisma.order.deleteMany({});

    // 3. Delete Carts
    console.log('Deleting carts...');
    await prisma.cartItem.deleteMany({});
    await prisma.cart.deleteMany({});

    // 4. Delete Products and Inventory
    console.log('Deleting products and inventory...');
    await prisma.inventoryLog.deleteMany({});
    await prisma.inventory.deleteMany({});
    await prisma.productImage.deleteMany({});
    await prisma.productVariant.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.product.deleteMany({});

    // 5. Delete Shop related configs
    console.log('Deleting shop configs and appointments...');
    await prisma.shopTiming.deleteMany({});
    await prisma.shopHoliday.deleteMany({});
    await prisma.shopDocument.deleteMany({});
    await prisma.appointment.deleteMany({});
    await prisma.timeSlot.deleteMany({});
    await prisma.provider.deleteMany({});
    await prisma.serviceOffering.deleteMany({});
    await prisma.shopSettlement.deleteMany({});
    await prisma.settlementReport.deleteMany({});
    await prisma.commission.deleteMany({});

    // 6. Delete Shops
    console.log('Deleting shops...');
    await prisma.shop.deleteMany({});

    // 7. Delete Wallets and Delivery Partners
    console.log('Deleting wallets and partners...');
    await prisma.walletTransaction.deleteMany({});
    await prisma.wallet.deleteMany({});
    await prisma.loyaltyTransaction.deleteMany({});
    await prisma.loyaltyAccount.deleteMany({});
    await prisma.deliveryPartner.deleteMany({});
    await prisma.address.deleteMany({});

    // 8. Delete all non-admin users
    console.log('Deleting non-admin users...');
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        role: {
          name: {
            notIn: ['SUPER_ADMIN', 'ADMIN', 'MARKET_ADMIN', 'DISTRICT_ADMIN']
          }
        }
      }
    });
    console.log(`Successfully deleted ${deletedUsers.count} non-admin users.`);

    console.log('✅ Database cleaned successfully! Ready for production launch.');
  } catch (error) {
    console.error('Error cleaning database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
