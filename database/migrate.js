#!/usr/bin/env node
// Jalankan: node database/migrate.js
// Ini apply schema.sql ke D1 via Wrangler
import { execSync } from 'child_process';

console.log('Applying schema to D1...');
try {
  execSync('wrangler d1 execute subserver-chat --file=database/schema.sql --remote', { stdio: 'inherit', cwd: process.cwd() });
  console.log('Schema applied successfully');
} catch (e) {
  console.error('Failed:', e.message);
  process.exit(1);
}
