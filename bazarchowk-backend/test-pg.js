const { Client } = require('pg');
const dbUrl = "postgresql://neondb_owner:npg_hoflQtkED5G7@ep-shiny-tree-aiqbxk4a.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({ connectionString: dbUrl });

async function main() {
  await client.connect();
  const orderRes = await client.query('SELECT id, status, "paymentMethod", "paymentStatus" FROM "Order" ORDER BY "createdAt" DESC LIMIT 5');
  console.log("=== LATEST ORDERS ===");
  console.log(orderRes.rows);

  const orderIds = orderRes.rows.map(o => o.id);
  const roleRes = await client.query('SELECT name FROM "Role"');
  console.log("=== ALL ROLES ===");
  console.log(roleRes.rows);

  const userRes = await client.query('SELECT r.name as role FROM "User" u JOIN "Role" r ON u."roleId" = r.id WHERE u.id = $1', ['e21adaaf-a20d-4490-9f0d-2877e51b5268']);
  console.log("=== RIDER ROLE ===");
  console.log(userRes.rows);

  await client.end();
}
main().catch(console.error);
