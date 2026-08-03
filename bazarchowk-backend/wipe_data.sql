-- BazarChowk Production Data Wipe (Corrected)
-- Preserves: ADMIN and SUPER_ADMIN users, Categories, Markets, Cities, AdPlans

BEGIN;

-- Appointments & services
DELETE FROM "Appointment";
DELETE FROM "TimeSlot";
DELETE FROM "Provider";
DELETE FROM "ServiceOffering";

-- Deliveries
DELETE FROM "TrackingPoint";
DELETE FROM "Delivery";
DELETE FROM "DeliveryPartner";

-- Orders
DELETE FROM "OrderStatusHistory";
DELETE FROM "OrderItem";
DELETE FROM "Payment";
DELETE FROM "Order";

-- Cart
DELETE FROM "CartItem";
DELETE FROM "Cart";

-- Reviews
DELETE FROM "Review";

-- Inventory & products
DELETE FROM "InventoryLog";
DELETE FROM "Inventory";
DELETE FROM "ProductImage";
DELETE FROM "ProductVariant";
DELETE FROM "Product";

-- Shop data
DELETE FROM "ShopDocument";
DELETE FROM "ShopHoliday";
DELETE FROM "ShopTiming";
DELETE FROM "Advertisement";
DELETE FROM "Shop";

-- Wallet & loyalty
DELETE FROM "LoyaltyTransaction";
DELETE FROM "LoyaltyAccount";
DELETE FROM "WalletTransaction";
DELETE FROM "Wallet";
DELETE FROM "Referral";

-- Finance & settlements
DELETE FROM "SettlementReport";
DELETE FROM "SettlementBatch";
DELETE FROM "SettlementItem";
DELETE FROM "CashReceipt";
DELETE FROM "CashShortage";
DELETE FROM "CashVerification";
DELETE FROM "CashCollection";
DELETE FROM "Commission";
DELETE FROM "CommissionRule";
DELETE FROM "FinanceAccount";

-- Business module
DELETE FROM "BusinessAuditLog";
DELETE FROM "BusinessSubscription";
DELETE FROM "BusinessLead";
DELETE FROM "BusinessStaff";
DELETE FROM "BusinessBank";
DELETE FROM "BusinessLocation";
DELETE FROM "BusinessVerification";
DELETE FROM "BusinessDocument";
DELETE FROM "BusinessBranch";
DELETE FROM "BusinessProfile";
DELETE FROM "Business";

-- Support & notifications
DELETE FROM "SupportMessage";
DELETE FROM "SupportTicket";
DELETE FROM "AuditLog";
DELETE FROM "Notification";
DELETE FROM "DeviceToken";
DELETE FROM "Session";
DELETE FROM "Address";

-- Delete all non-admin users (PRESERVES ADMIN + SUPER_ADMIN)
DELETE FROM "User" WHERE "roleId" NOT IN (
  SELECT id FROM "Role" WHERE name IN ('ADMIN', 'SUPER_ADMIN')
);

COMMIT;
