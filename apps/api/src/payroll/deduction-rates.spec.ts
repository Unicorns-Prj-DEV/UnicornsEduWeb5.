import { calculateDeductionAmounts } from './deduction-rates';

describe('calculateDeductionAmounts', () => {
  it('calculates tax on the amount after operating deduction', () => {
    expect(
      calculateDeductionAmounts({
        grossAmount: 100_000,
        operatingRatePercent: 10,
        taxRatePercent: 10,
      }),
    ).toEqual({
      grossAmount: 100_000,
      operatingDeductionAmount: 10_000,
      taxDeductionAmount: 9_000,
      totalDeductionAmount: 19_000,
      netAmount: 81_000,
    });
  });
});
