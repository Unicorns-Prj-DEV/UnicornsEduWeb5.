import { StaffRole } from 'generated/enums';
import { TRAINING_ACCESS_ROLES, hasTrainingAccess } from './training-access';

describe('hasTrainingAccess', () => {
  it('true khi có role training', () => {
    expect(hasTrainingAccess([StaffRole.teacher, StaffRole.training])).toBe(
      true,
    );
  });

  it('false khi không có role nào thuộc Ban Đào Tạo', () => {
    expect(hasTrainingAccess([StaffRole.teacher])).toBe(false);
    expect(hasTrainingAccess([])).toBe(false);
    expect(hasTrainingAccess(null)).toBe(false);
    expect(hasTrainingAccess(undefined)).toBe(false);
  });

  it('mọi role trong TRAINING_ACCESS_ROLES đều mở quyền', () => {
    for (const role of TRAINING_ACCESS_ROLES) {
      expect(hasTrainingAccess([role])).toBe(true);
    }
  });
});
