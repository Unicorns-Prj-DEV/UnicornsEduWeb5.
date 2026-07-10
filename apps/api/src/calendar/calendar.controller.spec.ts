jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

import { ForbiddenException } from '@nestjs/common';
import { StaffRole, UserRole } from '../../generated/enums';
import { CalendarController } from './calendar.controller';

describe('CalendarController', () => {
  const calendarService = {
    getClasses: jest.fn(),
    getTeachers: jest.fn(),
    getStudentsForCalendar: jest.fn(),
    getStaffScheduleEvents: jest.fn(),
  };
  const staffOperationsAccess = {
    resolveCalendarActor: jest.fn(),
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
    staffOperationsAccess.resolveCalendarActor.mockResolvedValue({
      id: 'teacher-1',
      roles: [StaffRole.teacher],
      calendarAccessMode: 'teacher',
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

    expect(staffOperationsAccess.resolveCalendarActor).toHaveBeenCalledWith(
      'user-1',
      UserRole.staff,
    );
    expect(calendarService.getClasses).toHaveBeenCalledWith(
      1,
      20,
      'math',
      'teacher-1',
      undefined,
    );
  });

  it('rejects non-teacher staff from class filters instead of falling back to unscoped data', async () => {
    staffOperationsAccess.resolveCalendarActor.mockRejectedValue(
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
    staffOperationsAccess.resolveCalendarActor.mockRejectedValue(
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

    expect(staffOperationsAccess.resolveCalendarActor).not.toHaveBeenCalled();
    expect(calendarService.getClasses).toHaveBeenCalledWith(
      1,
      20,
      'physics',
      undefined,
      undefined,
    );
  });

  it('lets training staff fetch managed class filters only', async () => {
    staffOperationsAccess.resolveCalendarActor.mockResolvedValue({
      id: 'training-1',
      roles: [StaffRole.training],
      calendarAccessMode: 'training',
    });
    calendarService.getClasses.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await controller.getClasses(
      {
        id: 'training-user',
        roleType: UserRole.staff,
      } as never,
      { page: 1, limit: 20 } as never,
      'math',
    );

    expect(calendarService.getClasses).toHaveBeenCalledWith(
      1,
      20,
      'math',
      undefined,
      'training-1',
    );
  });

  it('redacts student fields for training staff calendar events', async () => {
    staffOperationsAccess.resolveCalendarActor.mockResolvedValue({
      id: 'training-1',
      roles: [StaffRole.training],
      calendarAccessMode: 'training',
    });
    calendarService.getStaffScheduleEvents.mockResolvedValue({
      success: true,
      data: [],
      total: 0,
    });

    await controller.getStaffEvents(
      {
        id: 'training-user',
        roleType: UserRole.staff,
      } as never,
      { startDate: '2026-05-29', endDate: '2026-05-29' } as never,
    );

    expect(calendarService.getStaffScheduleEvents).toHaveBeenCalledWith(
      { startDate: '2026-05-29', endDate: '2026-05-29' },
      { redactStudentFields: true, trainingManagerStaffId: 'training-1' },
    );
  });

  it('keeps teacher staff calendar scoped to their own staff id', async () => {
    staffOperationsAccess.resolveCalendarActor.mockResolvedValue({
      id: 'teacher-1',
      roles: [StaffRole.teacher],
      calendarAccessMode: 'teacher',
    });
    calendarService.getStaffScheduleEvents.mockResolvedValue({
      success: true,
      data: [],
      total: 0,
    });

    await controller.getStaffEvents(
      {
        id: 'teacher-user',
        roleType: UserRole.staff,
      } as never,
      { startDate: '2026-05-29', endDate: '2026-05-29' } as never,
    );

    expect(calendarService.getStaffScheduleEvents).toHaveBeenCalledWith(
      { startDate: '2026-05-29', endDate: '2026-05-29' },
      { teacherId: 'teacher-1' },
    );
  });

  it('passes teacher search keywords to calendar teacher filters', async () => {
    calendarService.getTeachers.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 12,
    });

    await controller.getTeachers({ page: 1, limit: 12 } as never, 'an');

    expect(calendarService.getTeachers).toHaveBeenCalledWith(1, 12, 'an');
  });
});
