/**
 * Thêm tài khoản admin demo vào DB.
 * Chạy: npx ts-node -r tsconfig-paths/register scripts/seed-admin.ts
 * Hoặc: npm run seed:admin
 */
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

const ADMIN_EMAIL = 'admindemo@edu.vn';
const ADMIN_PASSWORD = 'Admin1234';

function loadEnv(): void {
  const apiEnv = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(apiEnv)) return;
  const content = fs.readFileSync(apiEnv, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL chưa có (đặt trong apps/api/.env).');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const client = new Client({ connectionString: url });

  await client.connect();

  await client.query(
    `INSERT INTO users (
      id, email, password_hash, role_type, email_verified, status, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), $1, $2, 'admin', true, 'active', NOW(), NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      role_type = 'admin',
      email_verified = true,
      status = 'active',
      updated_at = NOW()`,
    [ADMIN_EMAIL, passwordHash]
  );

  const r = await client.query('SELECT id, email FROM users WHERE email = $1', [ADMIN_EMAIL]);
  const user = r.rows[0];
  await client.end();

  console.log('Admin demo đã được thêm/cập nhật:', user?.id, user?.email);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
