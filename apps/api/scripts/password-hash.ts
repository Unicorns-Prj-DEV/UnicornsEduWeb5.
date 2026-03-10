/**
 * Convert plain-text passwords to bcrypt hash for seed data.
 */
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function hashPasswordOrDefault(plain: string | undefined | null): Promise<string> {
  const p = plain && String(plain).trim();
  if (!p) {
    return bcrypt.hash('SeedPassword1!', SALT_ROUNDS);
  }
  return hashPassword(p);
}
