/**
 * Anonymize PII using @faker-js/faker.
 * Replaces names, emails, phones, addresses with realistic random values.
 */
import { faker } from '@faker-js/faker';

/** Set seed for reproducible anonymization (optional) */
export function setFakerSeed(seed: number): void {
  faker.seed(seed);
}

export function anonymizeEmail(original?: string | null): string {
  return faker.internet.email();
}

export function anonymizeName(original?: string | null): string {
  return faker.person.fullName();
}

export function anonymizePhone(original?: string | null): string {
  return faker.phone.number();
}

export function anonymizeAddress(original?: string | null): string {
  return faker.location.streetAddress();
}

export function anonymizeProvince(original?: string | null): string {
  return faker.location.state();
}

export function anonymizeBankAccount(original?: string | null): string {
  return faker.finance.accountNumber();
}

/**
 * Anonymize a record by replacing known PII keys.
 * Modifies the object in place; keys are case-insensitive (camel or snake).
 */
const PII_KEYS: Record<string, (v: string) => string> = {
  fullname: anonymizeName,
  full_name: anonymizeName,
  name: anonymizeName,
  email: anonymizeEmail,
  phone: anonymizePhone,
  parentname: anonymizeName,
  parent_name: anonymizeName,
  parentphone: anonymizePhone,
  parent_phone: anonymizePhone,
  province: anonymizeProvince,
  bankaccount: anonymizeBankAccount,
  bank_account: anonymizeBankAccount,
  bankqrlink: () => faker.internet.url(),
  bank_qr_link: () => faker.internet.url(),
  university: () => faker.company.name(),
  highschool: () => faker.company.name(),
  high_school: () => faker.company.name(),
  school: () => faker.company.name(),
};

export function anonymizeRecord(record: Record<string, string>): Record<string, string> {
  const out = { ...record };
  for (const [key, value] of Object.entries(out)) {
    if (value === undefined || value === null || value === '') continue;
    const normalized = key.toLowerCase().replace(/\s+/g, '_');
    const fn = PII_KEYS[normalized];
    if (fn) {
      out[key] = fn(value);
    }
  }
  return out;
}
