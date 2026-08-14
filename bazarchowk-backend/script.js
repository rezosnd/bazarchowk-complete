const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_hoflQtkED5G7@ep-shiny-tree-aiqbxk4a.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require' });
  await client.connect();
  const res = await client.query('SELECT * FROM "AdminMarket" WHERE "marketArea" ILIKE \'%desari%\' OR "marketArea" ILIKE \'%bazar%\'');
  console.log('AdminMarkets:', res.rows);
  if (res.rows.length > 0) {
    const admin = res.rows[0].marketAdminId;
    const mAdmin = await client.query('SELECT * FROM "MarketAdmin" WHERE id = $1', [admin]);
    if (mAdmin.rows.length > 0) {
      const user = await client.query('SELECT * FROM "User" WHERE id = $1', [mAdmin.rows[0].userId]);
      console.log('User Admin Email:', user.rows[0].email, user.rows[0].firstName);
    }
  }
  const m = await client.query('SELECT * FROM "Market" WHERE name ILIKE \'%desari%\'');
  console.log('Markets:', m.rows);
  await client.end();
}
run();
