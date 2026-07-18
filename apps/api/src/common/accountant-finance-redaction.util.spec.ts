import { StaffRole, UserRole } from 'generated/enums';
import {
  redactClassStudentWalletBalances,
  resolveAccountantFinanceView,
} from './accountant-finance-redaction.util';

describe('resolveAccountantFinanceView', () => {
  it('treats legacy accountant as income finance view', () => {
    expect(
      resolveAccountantFinanceView(UserRole.staff, [StaffRole.accountant]),
    ).toBe('income');
  });

  it('resolves split accountant roles independently', () => {
    expect(
      resolveAccountantFinanceView(UserRole.staff, [
        StaffRole.accountant_income,
      ]),
    ).toBe('income');
    expect(
      resolveAccountantFinanceView(UserRole.staff, [
        StaffRole.accountant_expense,
      ]),
    ).toBe('expense');
  });

  it('gives combined income and expense accountants full finance view', () => {
    expect(
      resolveAccountantFinanceView(UserRole.staff, [
        StaffRole.accountant_income,
        StaffRole.accountant_expense,
      ]),
    ).toBe('full');
  });

  it('keeps admin and assistant on full finance view', () => {
    expect(resolveAccountantFinanceView(UserRole.admin, [])).toBe('full');
    expect(
      resolveAccountantFinanceView(UserRole.staff, [StaffRole.assistant]),
    ).toBe('full');
  });
});

describe('redactClassStudentWalletBalances', () => {
  const classDetail = {
    id: 'UNICL-1',
    students: [
      { id: 'UNIST-a', fullName: 'A', accountBalance: 100_000 },
      { id: 'UNIST-b', fullName: 'B', accountBalance: -50_000 },
    ],
  };

  it('keeps all balances in full mode', () => {
    expect(
      redactClassStudentWalletBalances(classDetail, { mode: 'full' }),
    ).toEqual(classDetail);
  });

  it('strips all balances in none mode', () => {
    const redacted = redactClassStudentWalletBalances(classDetail, {
      mode: 'none',
    });
    expect(redacted.students[0]).not.toHaveProperty('accountBalance');
    expect(redacted.students[1]).not.toHaveProperty('accountBalance');
    expect(redacted.students[0].fullName).toBe('A');
  });

  it('keeps only allowlisted student balances', () => {
    const redacted = redactClassStudentWalletBalances(classDetail, {
      mode: 'allowlist',
      allowedStudentIds: new Set(['UNIST-a']),
    });
    expect(redacted.students[0].accountBalance).toBe(100_000);
    expect(redacted.students[1]).not.toHaveProperty('accountBalance');
  });
});
