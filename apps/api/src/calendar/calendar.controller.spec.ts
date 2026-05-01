jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

import { ForbiddenException } from '@nestjs/common';
import { StaffRole, UserRole } from '../../generated/enums';
import { CalendarController } from './calendar.controller';

describe('CalendarController', () => {
  const calendarService = {
    getClasses: jest.fn(),
    getStudentsForCalendar: jest.fn(),
    getStaffScheduleEvents: jest.fn(),
  };
  const staffOperationsAccess = {
    resolveActor: jest.fn(),
  };

  let controller: CalendarController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CalendarController(
      calendarService as never,
      staffOperationsAccess as never,
    );
  });

  it('scopes class filters to the current teacher for staff users', async () => {
    staffOperationsAccess.resolveActor.mockResolvedValue({
      id: 'teacher-1',
      roles: [StaffRole.teacher],
    });
    calendarService.getClasses.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await controller.getClasses(
      {
        id: 'user-1',
        roleType: UserRole.staff,
      } as never,
      { page: 1, limit: 20 } as never,
      'math',
    );

    expect(staffOperationsAccess.resolveActor).toHaveBeenCalledWith(
      'user-1',
      UserRole.staff,
    );
    expect(calendarService.getClasses).toHaveBeenCalledWith(
      1,
      20,
      'math',
      'teacher-1',
    );
  });

  it('rejects non-teacher staff from class filters instead of falling back to unscoped data', async () => {
    staffOperationsAccess.resolveActor.mockRejectedValue(
      new ForbiddenException(
        'Màn /staff hiện chỉ mở cho staff có role teacher.',
      ),
    );

    await expect(
      controller.getClasses(
        {
          id: 'user-2',
          roleType: UserRole.staff,
        } as never,
        { page: 1, limit: 20 } as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(calendarService.getClasses).not.toHaveBeenCalled();
  });

  it('rejects non-teacher staff from student filters instead of falling back to unscoped data', async () => {
    staffOperationsAccess.resolveActor.mockRejectedValue(
      new ForbiddenException(
        'Màn /staff hiện chỉ mở cho staff có role teacher.',
      ),
    );

    await expect(
      controller.getStudentsForFilter(
        {
          id: 'user-3',
          roleType: UserRole.staff,
        } as never,
        { page: 1, limit: 20 } as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(calendarService.getStudentsForCalendar).not.toHaveBeenCalled();
  });

  it('keeps admin calendar class filters unscoped by teacher ownership', async () => {
    calendarService.getClasses.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await controller.getClasses(
      {
        id: 'admin-1',
        roleType: UserRole.admin,
      } as never,
      { page: 1, limit: 20 } as never,
      'physics',
    );

    expect(staffOperationsAccess.resolveActor).not.toHaveBeenCalled();
    expect(calendarService.getClasses).toHaveBeenCalledWith(
      1,
      20,
      'physics',
      undefined,
    );
  });
});
