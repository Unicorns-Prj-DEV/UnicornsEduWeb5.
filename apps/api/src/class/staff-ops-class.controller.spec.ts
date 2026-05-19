jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

import { ForbiddenException } from '@nestjs/common';
import { StaffRole, UserRole } from 'generated/enums';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';
import { StaffOpsClassController } from './staff-ops-class.controller';

describe('StaffOpsClassController makeup management', () => {
  const user = (overrides: Partial<JwtPayload>): JwtPayload => ({
    id: 'user-1',
    email: 'user@example.com',
    accountHandle: 'user',
    roleType: UserRole.staff,
    ...overrides,
  });

  const classService = {};
  const classSurveyService = {};
  const calendarService = {
    updateMakeupScheduleEventForClass: jest.fn(),
    deleteMakeupScheduleEventForClass: jest.fn(),
    assertTeacherCanManageMakeupScheduleEventForClass: jest.fn(),
  };
  const staffOperationsAccess = {
    resolveClassViewerActor: jest.fn(),
    assertTeacherAssignedToClass: jest.fn(),
  };

  let controller: StaffOpsClassController;

  beforeEach(() => {
    jest.clearAllMocks();
    calendarService.updateMakeupScheduleEventForClass.mockResolvedValue({
      success: true,
      data: {},
    });
    calendarService.deleteMakeupScheduleEventForClass.mockResolvedValue({
      success: true,
    });
    calendarService.assertTeacherCanManageMakeupScheduleEventForClass.mockResolvedValue(
      undefined,
    );
    staffOperationsAccess.resolveClassViewerActor.mockResolvedValue({
      id: 'teacher-1',
      roles: [StaffRole.teacher],
    });
    staffOperationsAccess.assertTeacherAssignedToClass.mockResolvedValue(
      undefined,
    );

    controller = new StaffOpsClassController(
      classService as never,
      classSurveyService as never,
      calendarService as never,
      staffOperationsAccess as never,
    );
  });

  it('allows admin to update a makeup event without teacher scoping', async () => {
    await controller.updateMakeupEventByClassId(
      user({
        id: 'admin-user',
        email: 'admin@example.com',
        accountHandle: 'admin',
        roleType: UserRole.admin,
      }),
      'class-1',
      'makeup-1',
      { note: 'new note' },
    );

    expect(
      staffOperationsAccess.resolveClassViewerActor,
    ).not.toHaveBeenCalled();
    expect(
      calendarService.updateMakeupScheduleEventForClass,
    ).toHaveBeenCalledWith(
      'class-1',
      'makeup-1',
      { note: 'new note' },
      expect.objectContaining({ userId: 'admin-user' }),
    );
  });

  it('allows assistant to update a makeup event without teacher ownership checks', async () => {
    staffOperationsAccess.resolveClassViewerActor.mockResolvedValueOnce({
      id: 'assistant-1',
      roles: [StaffRole.assistant],
    });

    await controller.updateMakeupEventByClassId(
      user({
        id: 'assistant-user',
        email: 'assistant@example.com',
        accountHandle: 'assistant',
      }),
      'class-1',
      'makeup-1',
      { note: 'assistant edit' },
    );

    expect(
      calendarService.assertTeacherCanManageMakeupScheduleEventForClass,
    ).not.toHaveBeenCalled();
    expect(
      calendarService.updateMakeupScheduleEventForClass,
    ).toHaveBeenCalledWith(
      'class-1',
      'makeup-1',
      { note: 'assistant edit' },
      expect.objectContaining({ userId: 'assistant-user' }),
    );
  });

  it('allows teacher owner to update only under their own teacher id', async () => {
    staffOperationsAccess.resolveClassViewerActor.mockResolvedValueOnce({
      id: 'teacher-1',
      roles: [StaffRole.teacher],
    });

    await controller.updateMakeupEventByClassId(
      user({
        id: 'teacher-user',
        email: 'teacher@example.com',
        accountHandle: 'teacher',
      }),
      'class-1',
      'makeup-1',
      { note: '' },
    );

    expect(
      staffOperationsAccess.assertTeacherAssignedToClass,
    ).toHaveBeenCalledWith('teacher-1', 'class-1');
    expect(
      calendarService.assertTeacherCanManageMakeupScheduleEventForClass,
    ).toHaveBeenCalledWith('class-1', 'makeup-1', 'teacher-1');
    expect(
      calendarService.updateMakeupScheduleEventForClass,
    ).toHaveBeenCalledWith(
      'class-1',
      'makeup-1',
      { note: '', teacherId: 'teacher-1' },
      expect.objectContaining({ userId: 'teacher-user' }),
    );
  });

  it('blocks unrelated staff from updating makeup events', async () => {
    staffOperationsAccess.resolveClassViewerActor.mockResolvedValueOnce({
      id: 'customer-care-1',
      roles: [StaffRole.customer_care],
    });

    await expect(
      controller.updateMakeupEventByClassId(
        user({
          id: 'staff-user',
          email: 'staff@example.com',
          accountHandle: 'staff',
        }),
        'class-1',
        'makeup-1',
        { note: 'blocked' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(
      calendarService.updateMakeupScheduleEventForClass,
    ).not.toHaveBeenCalled();
  });

  it('allows teacher owner to delete through the same ownership guard', async () => {
    staffOperationsAccess.resolveClassViewerActor.mockResolvedValueOnce({
      id: 'teacher-1',
      roles: [StaffRole.teacher],
    });

    await controller.deleteMakeupEventByClassId(
      user({
        id: 'teacher-user',
        email: 'teacher@example.com',
        accountHandle: 'teacher',
      }),
      'class-1',
      'makeup-1',
    );

    expect(
      calendarService.assertTeacherCanManageMakeupScheduleEventForClass,
    ).toHaveBeenCalledWith('class-1', 'makeup-1', 'teacher-1');
    expect(
      calendarService.deleteMakeupScheduleEventForClass,
    ).toHaveBeenCalledWith(
      'class-1',
      'makeup-1',
      expect.objectContaining({ userId: 'teacher-user' }),
    );
  });
});
