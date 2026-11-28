// deploy/test-env/seed/bootstrap-admin.mjs
//
// Tạo (hoặc đặt lại mật khẩu) tài khoản admin đầu tiên cho test env.
// Repo không có seed admin (scripts `seed`/`seed:admin` trong apps/api/package.json
// trỏ tới file không tồn tại) và API không có endpoint tạo admin khi chưa có admin,
// nên đây là bước duy nhất ghi thẳng DB. Mọi mock data khác đi qua HTTP API.
//
// Chạy trong container api (có pg + bcrypt của image prod):
//   docker compose ... run --rm --no-deps -T \
//     -e TEST_ADMIN_HANDLE -e TEST_ADMIN_EMAIL -e TEST_ADMIN_PASSWORD \
//     api node /app/test-seed/bootstrap-admin.mjs

import bcrypt from 'bcrypt';
import pg from 'pg';

const BCRYPT_ROUNDS = 10; // khớp auth.service.ts

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Thiếu biến môi trường ${name}`);
    process.exit(2);
  }
  return value;
}

const databaseUrl = process.env.DIRECT_URL || requireEnv('DATABASE_URL');
const handle = requireEnv('TEST_ADMIN_HANDLE');
const email = requireEnv('TEST_ADMIN_EMAIL');
const password = requireEnv('TEST_ADMIN_PASSWORD');

if (password.length < 6) {
  console.error('TEST_ADMIN_PASSWORD phải >= 6 ký tự (MinLength của DTO).');
  process.exit(2);
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  // id/updated_at do Prisma sinh phía client (@default(uuid()), @updatedAt) → SQL phải tự điền.
  const { rows } = await client.query(
    `INSERT INTO users (id, email, password_hash, role_type, account_handle,
                        email_verified, first_name, last_name, created_at, updated_at)
     VALUES (gen_random_uuid()::text, $1, $2, 'admin', $3, true, 'Admin', 'Test', now(), now())
     ON CONFLICT (account_handle) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role_type = 'admin',
           email_verified = true,
           updated_at = now()
     RETURNING id, (xmax = 0) AS inserted`,
    [email, passwordHash, handle],
  );
  const [row] = rows;
  console.log(
    `${row.inserted ? 'Đã tạo' : 'Đã đặt lại mật khẩu'} admin "${handle}" (id ${row.id}).`,
  );
} finally {
  await client.end();
}
