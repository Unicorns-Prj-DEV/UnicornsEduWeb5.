import { ForbiddenException } from '@nestjs/common';
import { CourseAccessService, type CourseActor } from './course-access.service';
import { CourseService } from './course.service';

describe('CourseService – lesson_plan_head scope', () => {
  const prisma = {
    course: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    class: { count: jest.fn() },
    courseLessonPlanMember: { findUnique: jest.fn() },
  };

  const head: CourseActor = {
    userId: 'user-head',
    staffId: 'UNISTAFF-head',
    roles: ['lesson_plan_head'],
    isAdminUser: false,
  };
  const assistant: CourseActor = {
    userId: 'user-assistant',
    staffId: 'UNISTAFF-assistant',
    roles: ['assistant'],
    isAdminUser: false,
  };
  const course = { id: 'course-x', name: 'Khoá X' };

  let service: CourseService;

  beforeEach(() => {
    jest.clearAllMocks();
    const access = new CourseAccessService(prisma as never);
    service = new CourseService(prisma as never, access);
    prisma.course.findUnique.mockResolvedValue(course);
    prisma.course.update.mockResolvedValue(course);
    prisma.class.count.mockResolvedValue(0);
  });

  it('auto-assigns a lesson_plan_head to the course they create', async () => {
    await service.create(head, { name: 'Khoá mới' } as never);
    expect(prisma.course.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Khoá mới',
        lessonPlanMembers: { create: { staffId: 'UNISTAFF-head' } },
      }) as unknown,
    });
  });

  it('does not add managers to the team when they create a course', async () => {
    await service.create(assistant, { name: 'Khoá mới' } as never);
    expect(prisma.course.create).toHaveBeenCalledWith({
      data: { name: 'Khoá mới', defaultDurationDays: null, sortOrder: 0 },
    });
  });

  it('rejects update and delete of a course the head is not assigned to', async () => {
    prisma.courseLessonPlanMember.findUnique.mockResolvedValue(null);

    await expect(
      service.update(head, course.id, { name: 'Đổi tên' } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove(head, course.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.course.update).not.toHaveBeenCalled();
    expect(prisma.course.delete).not.toHaveBeenCalled();
  });

  it('lets the head update and delete an assigned course', async () => {
    prisma.courseLessonPlanMember.findUnique.mockResolvedValue({ id: 'm1' });

    await service.update(head, course.id, { name: 'Đổi tên' } as never);
    await service.remove(head, course.id);
    expect(prisma.course.update).toHaveBeenCalled();
    expect(prisma.course.delete).toHaveBeenCalledWith({
      where: { id: course.id },
    });
  });
});
