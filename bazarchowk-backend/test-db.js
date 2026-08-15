const { Client } = require('pg');
const dbUrl = "postgresql://neondb_owner:npg_hoflQtkED5G7@ep-shiny-tree-aiqbxk4a.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const client = new Client({ connectionString: dbUrl });

async function main() {
  await client.connect();
  const res = await client.query('SELECT * FROM "CashCollection" ORDER BY "createdAt" DESC LIMIT 5');
  console.log("=== LATEST CASH COLLECTIONS ===");
  console.log(res.rows);



  const ordRes = await client.query('SELECT "riderId" FROM "Order" WHERE id = \'70f4e79b-0ec5-4d63-afd4-82a3848d4f8c\'');
  console.log("=== ORDER RIDER ===");
  console.log(ordRes.rows);

  await client.end();
}
main().catch(console.error);
