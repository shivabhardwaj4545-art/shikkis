import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('apps/backend/.env') });

import { initSchema } from '../apps/backend/src/db/schema.ts';

async function main() {
  console.log('Running initSchema...');
  await initSchema();
  console.log('Done initSchema!');
}

main().catch(console.error);
