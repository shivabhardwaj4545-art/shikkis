import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('apps/backend/.env') });

import db from '../apps/backend/src/db/client.ts';
import { seedFullDatabase } from '../apps/backend/src/db/seedFull.ts';

async function main() {
  console.log('Seeding database...');
  await seedFullDatabase(db);
  console.log('Seeding complete!');
  process.exit(0);
}

main().catch(console.error);
