import pkg from 'pg';
const { Pool } = pkg;

const users = ['postgres', 'shiva'];
const passwords = [
  'postgres', 'admin', 'root', '123456', 'password', '', 'shikkis', 'Postgres', 'PostgreSQL',
  '1234', '12345', '12345678', 'shiva', 'shiva123', 'postgres123', 'sql', 'mysql', 'system',
  'manager', '123', '0000', 'shiva@123', 'Shiva@123', 'admin123', 'Pass@123', 'password123',
  'P@ssword123', 'root123', '123456789'
];

async function testConnection() {
  for (const user of users) {
    for (const password of passwords) {
      const pool = new Pool({
        host: 'localhost',
        port: 5432,
        user,
        password,
        database: 'postgres',
        connectionTimeoutMillis: 1000,
      });

      try {
        const client = await pool.connect();
        console.log(`FOUND WORKING CREDENTIALS! user="${user}", password="${password}"`);
        client.release();
        await pool.end();
        return { user, password };
      } catch (err) {
        // failed
      } finally {
        await pool.end().catch(() => {});
      }
    }
  }
  console.log('No matching credentials found in list.');
  return null;
}

testConnection();
