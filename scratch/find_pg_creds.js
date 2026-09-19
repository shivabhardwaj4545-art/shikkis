import pkg from 'pg';
const { Pool } = pkg;

const users = ['postgres', 'shiva'];
const passwords = ['postgres', 'admin', 'root', '123456', 'password', '', 'shikkis', 'Postgres', 'PostgreSQL'];

async function testConnection() {
  for (const user of users) {
    for (const password of passwords) {
      const pool = new Pool({
        host: 'localhost',
        port: 5432,
        user,
        password,
        database: 'postgres', // default DB
      });

      try {
        const client = await pool.connect();
        console.log(` SUCCESS! user="${user}", password="${password}"`);
        
        // Check if database 'shikkis' exists
        const res = await client.query("SELECT datname FROM pg_database WHERE datname = 'shikkis'");
        console.log(`Database 'shikkis' exists: ${res.rows.length > 0}`);
        
        client.release();
        await pool.end();
        return { user, password, hasShikkisDb: res.rows.length > 0 };
      } catch (err) {
        // console.log(`Failed user="${user}", password="${password}":`, err.message);
      } finally {
        await pool.end().catch(() => {});
      }
    }
  }
  console.log('No matching credentials found!');
  return null;
}

testConnection();
