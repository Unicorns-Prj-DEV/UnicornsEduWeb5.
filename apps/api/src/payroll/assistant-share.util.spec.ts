import {
  isSelfManagedAssistantShareAttendance,
  isSelfManagedCustomerCareStaff,
  resolveAssistantManagerStaffIdForAttendance,
} from './assistant-share.util';

describe('assistant-share.util', () => {
  it('detects self-managed staff FK', () => {
    expect(
      isSelfManagedCustomerCareStaff({
        staffId: 'a',
        customerCareManagedByStaffId: 'a',
      }),
    ).toBe(true);
    expect(
      isSelfManagedCustomerCareStaff({
        staffId: 'a',
        customerCareManagedByStaffId: 'b',
      }),
    ).toBe(false);
    expect(
      isSelfManagedCustomerCareStaff({
        staffId: 'a',
        customerCareManagedByStaffId: null,
      }),
    ).toBe(false);
  });

  it('detects self-managed attendance snapshot', () => {
    expect(
      isSelfManagedAssistantShareAttendance({
        assistantManagerStaffId: 'x',
        customerCareStaffId: 'x',
      }),
    ).toBe(true);
    expect(
      isSelfManagedAssistantShareAttendance({
        assistantManagerStaffId: 'x',
        customerCareStaffId: 'y',
      }),
    ).toBe(false);
  });

  it('resolves null manager when self-managed', () => {
    expect(
      resolveAssistantManagerStaffIdForAttendance({
        customerCareStaffId: 'a',
        customerCareManagedByStaffId: 'a',
      }),
    ).toBeNull();
    expect(
      resolveAssistantManagerStaffIdForAttendance({
        customerCareStaffId: 'a',
        customerCareManagedByStaffId: 'b',
      }),
    ).toBe('b');
    expect(
      resolveAssistantManagerStaffIdForAttendance({
        customerCareStaffId: null,
        customerCareManagedByStaffId: 'b',
      }),
    ).toBeNull();
  });
});
