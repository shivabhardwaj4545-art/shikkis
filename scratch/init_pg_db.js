import pkg from 'pg';
import path from 'path';
import dotenv from 'dotenv';

const { Pool } = pkg;
const connectionString = 'postgresql://postgres:Shiva@123@localhost:5432/postgres';

async function initDb() {
  const rootPool = new Pool({ connectionString });
  const client = await rootPool.connect();

  // Create shikkis database if it doesn't exist
  const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'shikkis'");
  if (res.rows.length === 0) {
    console.log("Creating database 'shikkis'...");
    await client.query('CREATE DATABASE shikkis;');
  } else {
    console.log("Database 'shikkis' already exists.");
  }

  client.release();
  await rootPool.end();
}

initDb().catch(console.error);
