jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));
jest.mock('../../generated/client', () => ({
  Prisma: {},
}));

import { BadRequestException } from '@nestjs/common';
import {
  LessonOutputStatus,
  LessonTaskPriority,
  LessonTaskStatus,
} from '../../generated/enums';
import { LessonService } from './lesson.service';

describe('LessonService', () => {
  const mockPrisma = {
    lessonResource: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    lessonOutput: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    lessonTask: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    staffLessonTask: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    staffInfo: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const actionHistoryService = {
    recordCreate: jest.fn(),
    recordUpdate: jest.fn(),
    recordDelete: jest.fn(),
  };

  let service: LessonService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      <T>(
        input: Array<Promise<T>> | ((db: typeof mockPrisma) => T | Promise<T>),
      ) => {
        if (typeof input === 'function') {
          return input(mockPrisma);
        }

        if (Array.isArray(input)) {
          return Promise.all(input);
        }

        return input;
      },
    );

    service = new LessonService(
      mockPrisma as never,
      actionHistoryService as never,
    );
  });

  it('returns overview summary with normalized resources and tasks', async () => {
    mockPrisma.lessonResource.count.mockResolvedValue(4);
    mockPrisma.lessonTask.count
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2);
    mockPrisma.lessonResource.findMany.mockResolvedValue([
      {
        id: 'resource-1',
        title: 'Bộ đề vòng loại',
        description: 'Tài liệu mở đầu',
        resourceLink: 'https://example.com/resource',
        tags: ['resource', '  math ', 123],
        createdAt: new Date('2026-03-20T10:00:00.000Z'),
        updatedAt: new Date('2026-03-21T10:00:00.000Z'),
      },
    ]);
    mockPrisma.staffInfo.findMany.mockResolvedValue([
      {
        id: 'staff-1',
        fullName: 'Nguyen Van A',
        roles: ['lesson_plan'],
        status: 'active',
      },
    ]);
    mockPrisma.lessonTask.findMany.mockResolvedValue([
      {
        id: 'task-1',
        title: 'Soạn slide',
        description: 'Phiên bản đầu',
        status: LessonTaskStatus.pending,
        priority: LessonTaskPriority.high,
        dueDate: new Date('2026-03-25T00:00:00.000Z'),
        createdBy: 'staff-1',
        staffLessonTasks: [
          {
            staffId: 'staff-1',
            staff: {
              id: 'staff-1',
              fullName: 'Nguyen Van A',
              roles: ['lesson_plan'],
              status: 'active',
            },
          },
        ],
      },
    ]);

    const result = await service.getOverview({
      resourcePage: 1,
      resourceLimit: 6,
      taskPage: 1,
      taskLimit: 6,
    });

    expect(result.summary).toEqual({
      resourceCount: 4,
      taskCount: 7,
      openTaskCount: 3,
      completedTaskCount: 2,
    });
    expect(result.resources[0]).toEqual({
      id: 'resource-1',
      title: 'Bộ đề vòng loại',
      description: 'Tài liệu mở đầu',
      resourceLink: 'https://example.com/resource',
      tags: ['resource', 'math'],
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-21T10:00:00.000Z',
    });
    expect(result.resourcesMeta).toEqual({
      total: 4,
      page: 1,
      limit: 6,
      totalPages: 1,
    });
    expect(mockPrisma.lessonResource.findMany).toHaveBeenCalledWith({
      skip: 0,
      take: 6,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
    expect(result.tasks[0]).toEqual({
      id: 'task-1',
      title: 'Soạn slide',
      description: 'Phiên bản đầu',
      status: LessonTaskStatus.pending,
      priority: LessonTaskPriority.high,
      dueDate: '2026-03-25',
      createdByStaff: {
        id: 'staff-1',
        fullName: 'Nguyen Van A',
        roles: ['lesson_plan'],
        status: 'active',
      },
      assignees: [
        {
          id: 'staff-1',
          fullName: 'Nguyen Van A',
          roles: ['lesson_plan'],
          status: 'active',
        },
      ],
    });
    expect(result.tasksMeta).toEqual({
      total: 7,
      page: 1,
      limit: 6,
      totalPages: 2,
    });
    expect(mockPrisma.lessonTask.findMany).toHaveBeenCalledWith({
      skip: 0,
      take: 6,
      orderBy: [
        { updatedAt: 'desc' },
        { status: 'asc' },
        { dueDate: 'asc' },
        { priority: 'desc' },
        { title: 'asc' },
      ],
      include: {
        staffLessonTasks: {
          select: {
            staffId: true,
            staff: {
              select: {
                id: true,
                fullName: true,
                roles: true,
                status: true,
              },
            },
          },
        },
      },
    });
  });

  it('returns work board outputs with task context', async () => {
    mockPrisma.lessonTask.count.mockResolvedValue(5);
    mockPrisma.lessonOutput.groupBy.mockResolvedValue([
      {
        status: LessonOutputStatus.pending,
        _count: 2,
      },
      {
        status: LessonOutputStatus.completed,
        _count: 1,
      },
    ]);
    mockPrisma.lessonOutput.findMany.mockResolvedValue([
      {
        id: 'output-1',
        lessonName: 'Bài 1',
        originalTitle: null,
        source: null,
        originalLink: null,
        level: null,
        tags: ['algebra'],
        cost: 0,
        lessonTaskId: 'task-work-1',
        contestUploaded: 'Vĩnh Phúc HSG 2024',
        status: LessonOutputStatus.completed,
        date: new Date('2026-03-22T00:00:00.000Z'),
        updatedAt: new Date('2026-03-22T08:00:00.000Z'),
        createdAt: new Date('2026-03-22T07:00:00.000Z'),
        link: 'https://example.com/output-1',
        staffId: 'staff-owner',
        staff: {
          id: 'staff-owner',
          fullName: 'Planner Owner',
          roles: ['lesson_plan_head'],
          status: 'active',
        },
        lessonTask: {
          id: 'task-work-1',
          title: 'Sinh test đề HSG Vĩnh Phúc',
          status: LessonTaskStatus.in_progress,
          priority: LessonTaskPriority.high,
        },
      },
    ]);

    const result = await service.getWork({
      page: 1,
      limit: 6,
    });

    expect(result.summary).toEqual({
      taskCount: 5,
      outputCount: 3,
      pendingOutputCount: 2,
      completedOutputCount: 1,
      cancelledOutputCount: 0,
    });
    expect(result.outputsMeta).toEqual({
      total: 3,
      page: 1,
      limit: 6,
      totalPages: 1,
    });
    expect(result.outputs[0]).toEqual({
      id: 'output-1',
      lessonName: 'Bài 1',
      contestUploaded: 'Vĩnh Phúc HSG 2024',
      date: '2026-03-22',
      staffId: 'staff-owner',
      staffDisplayName: 'Planner Owner',
      status: LessonOutputStatus.completed,
      updatedAt: '2026-03-22T08:00:00.000Z',
      tags: ['algebra'],
      level: null,
      link: 'https://example.com/output-1',
      originalLink: null,
      cost: 0,
      task: {
        id: 'task-work-1',
        title: 'Sinh test đề HSG Vĩnh Phúc',
        status: LessonTaskStatus.in_progress,
        priority: LessonTaskPriority.high,
      },
    });
    expect(mockPrisma.lessonOutput.findMany).toHaveBeenCalledWith({
      skip: 0,
      take: 6,
      orderBy: [{ updatedAt: 'desc' }, { date: 'desc' }, { lessonName: 'asc' }],
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            roles: true,
            status: true,
          },
        },
        lessonTask: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
      },
    });
  });

  it('applies work filters to counts and list queries', async () => {
    mockPrisma.lessonTask.count.mockResolvedValue(2);
    mockPrisma.lessonOutput.groupBy.mockResolvedValue([
      {
        status: LessonOutputStatus.pending,
        _count: 1,
      },
    ]);
    mockPrisma.lessonOutput.findMany.mockResolvedValue([]);

    await service.getWork({
      page: 1,
      limit: 10,
      year: 2026,
      month: 3,
      search: 'hsg',
      tag: 'checker',
      staffId: 'staff-owner',
      outputStatus: 'pending',
      level: '3',
    });

    const expectedWhere = {
      AND: [
        {
          date: {
            gte: new Date('2026-03-01T00:00:00.000Z'),
            lte: new Date('2026-03-31T00:00:00.000Z'),
          },
        },
        {
          OR: [
            { lessonName: { contains: 'hsg', mode: 'insensitive' } },
            { contestUploaded: { contains: 'hsg', mode: 'insensitive' } },
          ],
        },
        {
          OR: [
            { lessonName: { contains: 'checker', mode: 'insensitive' } },
            { contestUploaded: { contains: 'checker', mode: 'insensitive' } },
          ],
        },
        { staffId: 'staff-owner' },
        { status: LessonOutputStatus.pending },
        {
          OR: [
            { level: { equals: 'Level 3', mode: 'insensitive' } },
            { level: { equals: '3', mode: 'insensitive' } },
          ],
        },
      ],
    };

    expect(mockPrisma.lessonOutput.groupBy).toHaveBeenCalledWith({
      by: ['status'],
      where: expectedWhere,
      orderBy: {
        status: 'asc',
      },
      _count: true,
    });
    expect(mockPrisma.lessonOutput.findMany).toHaveBeenCalledWith({
      where: expectedWhere,
      skip: 0,
      take: 10,
      orderBy: [{ updatedAt: 'desc' }, { date: 'desc' }, { lessonName: 'asc' }],
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            roles: true,
            status: true,
          },
        },
        lessonTask: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
      },
    });
  });

  it('stores responsible staff using the actor staff profile when available', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({ id: 'staff-creator' });
    mockPrisma.lessonTask.create.mockResolvedValue({ id: 'task-1' });
    mockPrisma.staffInfo.findMany
      .mockResolvedValueOnce([{ id: 'staff-assignee' }])
      .mockResolvedValueOnce([
        {
          id: 'staff-creator',
          fullName: 'Lesson Planner',
          roles: ['lesson_plan'],
          status: 'active',
        },
      ]);
    mockPrisma.staffLessonTask.findMany.mockResolvedValue([]);
    mockPrisma.lessonTask.findUnique.mockResolvedValue({
      id: 'task-1',
      title: 'Soạn outline buổi 1',
      description: 'Checklist phần mở đầu',
      status: LessonTaskStatus.pending,
      priority: LessonTaskPriority.medium,
      dueDate: new Date('2026-03-24T00:00:00.000Z'),
      createdBy: 'staff-creator',
      staffLessonTasks: [
        {
          staffId: 'staff-assignee',
          staff: {
            id: 'staff-assignee',
            fullName: 'Editor 01',
            roles: ['lesson_plan'],
            status: 'active',
          },
        },
      ],
    });

    await service.createTask(
      {
        title: '  Soạn outline buổi 1  ',
        description: '  Checklist phần mở đầu ',
        dueDate: '2026-03-24',
        assignedStaffIds: ['staff-assignee'],
      },
      {
        userId: 'user-1',
        userEmail: 'planner@example.com',
        roleType: 'admin',
      },
    );

    expect(mockPrisma.lessonTask.create).toHaveBeenCalledWith({
      data: {
        title: 'Soạn outline buổi 1',
        description: 'Checklist phần mở đầu',
        status: LessonTaskStatus.pending,
        priority: LessonTaskPriority.medium,
        dueDate: new Date('2026-03-24T00:00:00.000Z'),
        createdBy: 'staff-creator',
      },
    });
    expect(mockPrisma.staffLessonTask.createMany).toHaveBeenCalledWith({
      data: [
        {
          lessonTaskId: 'task-1',
          staffId: 'staff-assignee',
        },
      ],
    });
    expect(actionHistoryService.recordCreate).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        entityType: 'lesson_task',
        entityId: 'task-1',
      }),
    );
  });

  it('uses the selected lesson planner as responsible staff when provided', async () => {
    mockPrisma.staffInfo.findFirst.mockResolvedValue({ id: 'staff-head' });
    mockPrisma.lessonTask.create.mockResolvedValue({ id: 'task-2' });
    mockPrisma.staffInfo.findMany
      .mockResolvedValueOnce([{ id: 'staff-assignee' }])
      .mockResolvedValueOnce([
        {
          id: 'staff-head',
          fullName: 'Lesson Head',
          roles: ['lesson_plan_head'],
          status: 'active',
        },
      ]);
    mockPrisma.staffLessonTask.findMany.mockResolvedValue([]);
    mockPrisma.lessonTask.findUnique.mockResolvedValue({
      id: 'task-2',
      title: 'Chốt flow biên tập',
      description: null,
      status: LessonTaskStatus.pending,
      priority: LessonTaskPriority.high,
      dueDate: null,
      createdBy: 'staff-head',
      staffLessonTasks: [
        {
          staffId: 'staff-assignee',
          staff: {
            id: 'staff-assignee',
            fullName: 'Editor 02',
            roles: ['lesson_plan'],
            status: 'active',
          },
        },
      ],
    });

    await service.createTask(
      {
        title: 'Chốt flow biên tập',
        createdByStaffId: 'staff-head',
        assignedStaffIds: ['staff-assignee'],
      },
      {
        userId: 'user-1',
        userEmail: 'planner@example.com',
        roleType: 'admin',
      },
    );

    expect(mockPrisma.lessonTask.create).toHaveBeenCalledWith({
      data: {
        title: 'Chốt flow biên tập',
        description: null,
        status: LessonTaskStatus.pending,
        priority: LessonTaskPriority.medium,
        dueDate: null,
        createdBy: 'staff-head',
      },
    });
  });

  it('filters lesson task staff options to lesson planning roles only', async () => {
    mockPrisma.staffInfo.findMany.mockResolvedValue([
      {
        id: 'staff-1',
        fullName: 'Lesson Planner',
        roles: ['lesson_plan'],
        status: 'active',
      },
    ]);

    await service.searchTaskStaffOptions({
      search: 'planner',
      limit: 3,
    });

    expect(mockPrisma.staffInfo.findMany).toHaveBeenCalledWith({
      where: {
        roles: {
          hasSome: ['lesson_plan', 'lesson_plan_head'],
        },
        fullName: {
          contains: 'planner',
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        fullName: true,
        roles: true,
        status: true,
      },
      orderBy: [{ status: 'asc' }, { fullName: 'asc' }],
      take: 3,
    });
  });

  it('syncs assignees by diff when updating a lesson task', async () => {
    mockPrisma.lessonTask.findUnique
      .mockResolvedValueOnce({
        id: 'task-1',
        title: 'Soạn slide',
        description: 'Bản cũ',
        status: LessonTaskStatus.pending,
        priority: LessonTaskPriority.medium,
        dueDate: null,
        createdBy: null,
        staffLessonTasks: [
          {
            staffId: 'staff-1',
            staff: {
              id: 'staff-1',
              fullName: 'Planner 01',
              roles: ['lesson_plan'],
              status: 'active',
            },
          },
          {
            staffId: 'staff-2',
            staff: {
              id: 'staff-2',
              fullName: 'Planner 02',
              roles: ['assistant'],
              status: 'active',
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        id: 'task-1',
        title: 'Soạn slide',
        description: 'Bản cũ',
        status: LessonTaskStatus.pending,
        priority: LessonTaskPriority.medium,
        dueDate: null,
        createdBy: null,
        staffLessonTasks: [
          {
            staffId: 'staff-2',
            staff: {
              id: 'staff-2',
              fullName: 'Planner 02',
              roles: ['assistant'],
              status: 'active',
            },
          },
          {
            staffId: 'staff-3',
            staff: {
              id: 'staff-3',
              fullName: 'Planner 03',
              roles: ['lesson_plan'],
              status: 'active',
            },
          },
        ],
      });
    mockPrisma.staffInfo.findMany.mockResolvedValue([
      { id: 'staff-2' },
      { id: 'staff-3' },
    ]);
    mockPrisma.staffLessonTask.findMany.mockResolvedValue([
      { staffId: 'staff-1' },
      { staffId: 'staff-2' },
    ]);

    await service.updateTask('task-1', {
      assignedStaffIds: ['staff-2', 'staff-3'],
    });

    expect(mockPrisma.staffLessonTask.deleteMany).toHaveBeenCalledWith({
      where: {
        lessonTaskId: 'task-1',
        staffId: {
          in: ['staff-1'],
        },
      },
    });
    expect(mockPrisma.staffLessonTask.createMany).toHaveBeenCalledWith({
      data: [
        {
          lessonTaskId: 'task-1',
          staffId: 'staff-3',
        },
      ],
    });
  });

  it('returns a hydrated lesson task detail by id', async () => {
    mockPrisma.staffInfo.findMany.mockResolvedValue([
      {
        id: 'staff-creator',
        fullName: 'Planner Owner',
        roles: ['lesson_plan'],
        status: 'active',
      },
    ]);
    mockPrisma.lessonTask.findUnique.mockResolvedValue({
      id: 'task-3',
      title: 'Review final slide',
      description: 'Kiểm tra lần cuối trước khi xuất bản',
      status: LessonTaskStatus.in_progress,
      priority: LessonTaskPriority.high,
      dueDate: new Date('2026-03-27T00:00:00.000Z'),
      createdBy: 'staff-creator',
      staffLessonTasks: [
        {
          staffId: 'staff-creator',
          staff: {
            id: 'staff-creator',
            fullName: 'Planner Owner',
            roles: ['lesson_plan'],
            status: 'active',
          },
        },
      ],
    });
    mockPrisma.lessonOutput.findMany.mockResolvedValue([
      {
        id: 'output-1',
        lessonTaskId: 'task-3',
        lessonName: 'Bài 1',
        originalTitle: 'Đề gốc bài 1',
        source: 'Vĩnh Phúc HSG 2024',
        originalLink: 'https://example.com/original-1',
        level: 'HSG tỉnh',
        tags: ['hsg'],
        cost: 100000,
        date: new Date('2026-03-27T00:00:00.000Z'),
        contestUploaded: 'Vĩnh Phúc HSG 2024',
        link: 'https://example.com/output-1',
        staffId: 'staff-creator',
        status: LessonOutputStatus.completed,
        createdAt: new Date('2026-03-27T02:00:00.000Z'),
        updatedAt: new Date('2026-03-27T03:00:00.000Z'),
        staff: {
          id: 'staff-creator',
          fullName: 'Planner Owner',
          roles: ['lesson_plan'],
          status: 'active',
        },
        lessonTask: {
          id: 'task-3',
          title: 'Review final slide',
          status: LessonTaskStatus.in_progress,
          priority: LessonTaskPriority.high,
        },
      },
    ]);
    mockPrisma.lessonResource.findMany.mockResolvedValue([
      {
        id: 'resource-10',
        title: 'Đề gốc',
        resourceLink: 'https://example.com/resource-10',
      },
    ]);

    const result = await service.getTaskById('task-3');

    expect(result).toEqual({
      id: 'task-3',
      title: 'Review final slide',
      description: 'Kiểm tra lần cuối trước khi xuất bản',
      status: LessonTaskStatus.in_progress,
      priority: LessonTaskPriority.high,
      dueDate: '2026-03-27',
      createdByStaff: {
        id: 'staff-creator',
        fullName: 'Planner Owner',
        roles: ['lesson_plan'],
        status: 'active',
      },
      assignees: [
        {
          id: 'staff-creator',
          fullName: 'Planner Owner',
          roles: ['lesson_plan'],
          status: 'active',
        },
      ],
      outputs: [
        {
          id: 'output-1',
          lessonName: 'Bài 1',
          contestUploaded: 'Vĩnh Phúc HSG 2024',
          date: '2026-03-27',
          staffId: 'staff-creator',
          staffDisplayName: 'Planner Owner',
          status: LessonOutputStatus.completed,
        },
      ],
      outputProgress: {
        total: 1,
        completed: 1,
      },
      resourcePreview: [
        {
          id: 'resource-10',
          title: 'Đề gốc',
          resourceLink: 'https://example.com/resource-10',
        },
      ],
      contestUploadedSummary: ['Vĩnh Phúc HSG 2024'],
    });
  });

  it('rejects assignees outside lesson planning roles', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({ id: 'staff-creator' });
    mockPrisma.staffInfo.findMany.mockResolvedValue([{ id: 'staff-lesson' }]);

    await expect(
      service.createTask(
        {
          title: 'Soạn outline buổi 2',
          assignedStaffIds: ['staff-lesson', 'staff-other'],
        },
        {
          userId: 'user-1',
          userEmail: 'planner@example.com',
          roleType: 'admin',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockPrisma.staffInfo.findMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['staff-lesson', 'staff-other'],
        },
        roles: {
          hasSome: ['lesson_plan', 'lesson_plan_head'],
        },
      },
      select: {
        id: true,
      },
    });
  });

  it('creates a lesson output under a task and maps the full response', async () => {
    mockPrisma.lessonTask.findUnique.mockResolvedValue({ id: 'task-output-1' });
    mockPrisma.staffInfo.findUnique.mockResolvedValue({ id: 'staff-output-1' });
    mockPrisma.lessonOutput.create.mockResolvedValue({
      id: 'output-99',
      lessonTaskId: 'task-output-1',
      lessonName: 'Bài 2 - Hình học',
      originalTitle: 'Đề gốc bài 2',
      source: 'Vĩnh Phúc HSG 2024',
      originalLink: 'https://example.com/original-output',
      level: 'HSG tỉnh',
      tags: ['hsg', 'hinh-hoc'],
      cost: 250000,
      date: new Date('2026-03-28T00:00:00.000Z'),
      contestUploaded: 'Vĩnh Phúc HSG 2024',
      link: 'https://example.com/final-output',
      staffId: 'staff-output-1',
      status: LessonOutputStatus.pending,
      createdAt: new Date('2026-03-28T08:00:00.000Z'),
      updatedAt: new Date('2026-03-28T09:00:00.000Z'),
      staff: {
        id: 'staff-output-1',
        fullName: 'Output Owner',
        roles: ['lesson_plan'],
        status: 'active',
      },
      lessonTask: {
        id: 'task-output-1',
        title: 'Sinh test đề',
        status: LessonTaskStatus.in_progress,
        priority: LessonTaskPriority.high,
      },
    });

    const result = await service.createOutput(
      {
        lessonTaskId: 'task-output-1',
        lessonName: '  Bài 2 - Hình học  ',
        originalTitle: '  Đề gốc bài 2 ',
        source: '  Vĩnh Phúc HSG 2024 ',
        originalLink: 'https://example.com/original-output',
        level: ' HSG tỉnh ',
        tags: ['hsg', '  hinh-hoc  '],
        cost: 250000,
        date: '2026-03-28',
        contestUploaded: '  Vĩnh Phúc HSG 2024 ',
        link: 'https://example.com/final-output',
        staffId: 'staff-output-1',
      },
      {
        userId: 'user-1',
        userEmail: 'planner@example.com',
        roleType: 'admin',
      },
    );

    expect(mockPrisma.lessonOutput.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          lessonTaskId: 'task-output-1',
          lessonName: 'Bài 2 - Hình học',
          originalTitle: 'Đề gốc bài 2',
          source: 'Vĩnh Phúc HSG 2024',
          originalLink: 'https://example.com/original-output',
          level: 'HSG tỉnh',
          tags: ['hsg', 'hinh-hoc'],
          cost: 250000,
          date: new Date('2026-03-28T00:00:00.000Z'),
          contestUploaded: 'Vĩnh Phúc HSG 2024',
          link: 'https://example.com/final-output',
          staffId: 'staff-output-1',
          status: LessonOutputStatus.pending,
        },
      }),
    );
    expect(result).toEqual({
      id: 'output-99',
      lessonTaskId: 'task-output-1',
      lessonName: 'Bài 2 - Hình học',
      originalTitle: 'Đề gốc bài 2',
      source: 'Vĩnh Phúc HSG 2024',
      originalLink: 'https://example.com/original-output',
      level: 'HSG tỉnh',
      tags: ['hsg', 'hinh-hoc'],
      cost: 250000,
      date: '2026-03-28',
      contestUploaded: 'Vĩnh Phúc HSG 2024',
      link: 'https://example.com/final-output',
      staffId: 'staff-output-1',
      staff: {
        id: 'staff-output-1',
        fullName: 'Output Owner',
        roles: ['lesson_plan'],
        status: 'active',
      },
      status: LessonOutputStatus.pending,
      task: {
        id: 'task-output-1',
        title: 'Sinh test đề',
        status: LessonTaskStatus.in_progress,
        priority: LessonTaskPriority.high,
      },
      createdAt: '2026-03-28T08:00:00.000Z',
      updatedAt: '2026-03-28T09:00:00.000Z',
    });
    expect(actionHistoryService.recordCreate).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        entityType: 'lesson_output',
        entityId: 'output-99',
      }),
    );
  });

  it('creates a taskless lesson output when lessonTaskId is omitted', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue(null);
    mockPrisma.lessonOutput.create.mockResolvedValue({
      id: 'output-taskless-1',
      lessonTaskId: null,
      lessonName: 'Bài lẻ',
      originalTitle: null,
      source: 'Codeforces',
      originalLink: 'https://example.com/original-taskless',
      level: 'Level 5',
      tags: ['checker'],
      cost: 0,
      date: new Date('2026-03-29T00:00:00.000Z'),
      contestUploaded: null,
      link: null,
      staffId: null,
      status: LessonOutputStatus.pending,
      createdAt: new Date('2026-03-29T08:00:00.000Z'),
      updatedAt: new Date('2026-03-29T08:30:00.000Z'),
      staff: null,
      lessonTask: null,
    });

    const result = await service.createOutput({
      lessonName: '  Bài lẻ ',
      source: ' Codeforces ',
      originalLink: 'https://example.com/original-taskless',
      level: ' Level 5 ',
      tags: [' checker '],
      date: '2026-03-29',
      staffId: null,
    });

    expect(mockPrisma.lessonTask.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.lessonOutput.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          lessonTaskId: null,
          lessonName: 'Bài lẻ',
          originalTitle: null,
          source: 'Codeforces',
          originalLink: 'https://example.com/original-taskless',
          level: 'Level 5',
          tags: ['checker'],
          cost: 0,
          date: new Date('2026-03-29T00:00:00.000Z'),
          contestUploaded: null,
          link: null,
          staffId: null,
          status: LessonOutputStatus.pending,
        },
      }),
    );
    expect(result).toEqual({
      id: 'output-taskless-1',
      lessonTaskId: null,
      lessonName: 'Bài lẻ',
      originalTitle: null,
      source: 'Codeforces',
      originalLink: 'https://example.com/original-taskless',
      level: 'Level 5',
      tags: ['checker'],
      cost: 0,
      date: '2026-03-29',
      contestUploaded: null,
      link: null,
      staffId: null,
      staff: null,
      status: LessonOutputStatus.pending,
      task: null,
      createdAt: '2026-03-29T08:00:00.000Z',
      updatedAt: '2026-03-29T08:30:00.000Z',
    });
  });

  it('disconnects a lesson output from its task when lessonTaskId is null on update', async () => {
    mockPrisma.lessonOutput.findUnique
      .mockResolvedValueOnce({
        id: 'output-42',
        lessonTaskId: 'task-output-42',
        lessonName: 'Bài đang gắn task',
        originalTitle: null,
        source: null,
        originalLink: null,
        level: null,
        tags: [],
        cost: 0,
        date: new Date('2026-03-30T00:00:00.000Z'),
        contestUploaded: null,
        link: null,
        staffId: null,
        status: LessonOutputStatus.pending,
        createdAt: new Date('2026-03-30T08:00:00.000Z'),
        updatedAt: new Date('2026-03-30T08:30:00.000Z'),
        staff: null,
        lessonTask: {
          id: 'task-output-42',
          title: 'Task cũ',
          status: LessonTaskStatus.pending,
          priority: LessonTaskPriority.medium,
        },
      })
      .mockResolvedValueOnce({
        id: 'output-42',
        lessonTaskId: null,
        lessonName: 'Bài đang gắn task',
        originalTitle: null,
        source: null,
        originalLink: null,
        level: null,
        tags: [],
        cost: 0,
        date: new Date('2026-03-30T00:00:00.000Z'),
        contestUploaded: null,
        link: null,
        staffId: null,
        status: LessonOutputStatus.pending,
        createdAt: new Date('2026-03-30T08:00:00.000Z'),
        updatedAt: new Date('2026-03-30T09:00:00.000Z'),
        staff: null,
        lessonTask: null,
      });
    mockPrisma.lessonOutput.update.mockResolvedValue({
      id: 'output-42',
      lessonTaskId: null,
      lessonName: 'Bài đang gắn task',
      originalTitle: null,
      source: null,
      originalLink: null,
      level: null,
      tags: [],
      cost: 0,
      date: new Date('2026-03-30T00:00:00.000Z'),
      contestUploaded: null,
      link: null,
      staffId: null,
      status: LessonOutputStatus.pending,
      createdAt: new Date('2026-03-30T08:00:00.000Z'),
      updatedAt: new Date('2026-03-30T09:00:00.000Z'),
      staff: null,
      lessonTask: null,
    });

    const result = await service.updateOutput('output-42', {
      lessonTaskId: null,
    });

    expect(mockPrisma.lessonOutput.update).toHaveBeenCalledWith({
      where: { id: 'output-42' },
      data: {
        lessonTask: {
          disconnect: true,
        },
      },
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            roles: true,
            status: true,
          },
        },
        lessonTask: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
      },
    });
    expect(result.task).toBeNull();
    expect(result.lessonTaskId).toBeNull();
  });

  it('rejects resource creation when title or link is blank after trimming', async () => {
    await expect(
      service.createResource({
        title: '  ',
        resourceLink: '   ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
