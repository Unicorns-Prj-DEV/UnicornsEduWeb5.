import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/client';
import {
  LessonOutputStatus,
  LessonTaskPriority,
  LessonTaskStatus,
  StaffRole,
  StaffStatus,
} from 'generated/enums';
import {
  ActionHistoryActor,
  ActionHistoryService,
} from '../action-history/action-history.service';
import {
  CreateLessonOutputDto,
  CreateLessonResourceDto,
  CreateLessonTaskDto,
  LessonOutputResponseDto,
  LessonOutputStaffDto,
  LessonOutputStaffOptionDto,
  LessonOutputStaffOptionsQueryDto,
  LessonOutputTaskSummaryDto,
  LessonOverviewQueryDto,
  LessonOverviewResponseDto,
  LessonResourcePreviewDto,
  LessonResourceResponseDto,
  LessonTaskAssigneeDto,
  LessonTaskCreatorDto,
  LessonTaskDetailResponseDto,
  LessonTaskOutputListItemDto,
  LessonTaskOutputProgressDto,
  LessonTaskResponseDto,
  LessonTaskStaffOptionDto,
  LessonTaskStaffOptionsQueryDto,
  LessonWorkOutputItemDto,
  LessonWorkQueryDto,
  LessonWorkResponseDto,
  UpdateLessonResourceDto,
  UpdateLessonOutputDto,
  UpdateLessonTaskDto,
} from '../dtos/lesson.dto';
import { PrismaService } from '../prisma/prisma.service';

type LessonTaskRecord = {
  id: string;
  title: string | null;
  description: string | null;
  status: LessonTaskStatus;
  priority: LessonTaskPriority;
  dueDate: Date | null;
  createdBy: string | null;
  staffLessonTasks: Array<{
    staffId: string;
    staff: {
      id: string;
      fullName: string;
      roles: StaffRole[];
      status: StaffStatus;
    };
  }>;
};

type HydratedLessonTaskRecord = LessonTaskRecord & {
  createdByStaff: LessonTaskCreatorDto | null;
  assignees: LessonTaskAssigneeDto[];
};

type LessonOutputRecord = {
  id: string;
  lessonTaskId: string | null;
  lessonName: string;
  originalTitle: string | null;
  source: string | null;
  originalLink: string | null;
  level: string | null;
  tags: unknown;
  cost: number;
  date: Date;
  contestUploaded: string | null;
  link: string | null;
  staffId: string | null;
  status: LessonOutputStatus;
  createdAt: Date;
  updatedAt: Date;
  staff: {
    id: string;
    fullName: string;
    roles: StaffRole[];
    status: StaffStatus;
  } | null;
  lessonTask: {
    id: string;
    title: string | null;
    status: LessonTaskStatus;
    priority: LessonTaskPriority;
  } | null;
};

const LESSON_TASK_ASSIGNABLE_ROLES = [
  StaffRole.lesson_plan,
  StaffRole.lesson_plan_head,
] as const;

function toTrimmedString(value: string | null | undefined) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function toDateOnlyOrNull(value: string | null | undefined) {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsedDate = new Date(trimmed);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new BadRequestException('dueDate không hợp lệ.');
  }

  return parsedDate;
}

function normalizeTags(value: string[] | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item).trim())
        .filter((item) => item.length > 0),
    ),
  );
}

function parseJsonStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

@Injectable()
export class LessonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionHistoryService: ActionHistoryService,
  ) {}

  async getOverview(
    query: LessonOverviewQueryDto = {},
  ): Promise<LessonOverviewResponseDto> {
    const resourceLimit = this.resolveLimit(query.resourceLimit, 6);
    const taskLimit = this.resolveLimit(query.taskLimit, 6);
    const resourceRequestedPage = this.resolvePage(query.resourcePage);
    const taskRequestedPage = this.resolvePage(query.taskPage);

    const [resourceCount, taskCount, openTaskCount, completedTaskCount] =
      await this.prisma.$transaction([
        this.prisma.lessonResource.count(),
        this.prisma.lessonTask.count(),
        this.prisma.lessonTask.count({
          where: {
            status: {
              in: [LessonTaskStatus.pending, LessonTaskStatus.in_progress],
            },
          },
        }),
        this.prisma.lessonTask.count({
          where: { status: LessonTaskStatus.completed },
        }),
      ]);

    const resourceMeta = this.buildListMeta(
      resourceCount,
      resourceRequestedPage,
      resourceLimit,
    );
    const taskMeta = this.buildListMeta(
      taskCount,
      taskRequestedPage,
      taskLimit,
    );

    const [resources, tasks] = await this.prisma.$transaction([
      this.prisma.lessonResource.findMany({
        skip: (resourceMeta.page - 1) * resourceMeta.limit,
        take: resourceMeta.limit,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.lessonTask.findMany({
        skip: (taskMeta.page - 1) * taskMeta.limit,
        take: taskMeta.limit,
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
      }),
    ]);
    const hydratedTasks = await this.hydrateTaskRecords(this.prisma, tasks);

    return {
      summary: {
        resourceCount,
        taskCount,
        openTaskCount,
        completedTaskCount,
      },
      resources: resources.map((resource) => this.mapResource(resource)),
      resourcesMeta: resourceMeta,
      tasks: hydratedTasks.map((task) => this.mapTask(task)),
      tasksMeta: taskMeta,
    };
  }

  async getWork(
    query: LessonWorkQueryDto = {},
  ): Promise<LessonWorkResponseDto> {
    type LessonOutputStatusGroup = {
      status: LessonOutputStatus;
      _count: number;
    };

    const limit = this.resolveLimit(query.limit, 6);
    const requestedPage = this.resolvePage(query.page);

    const workWhere = this.buildWorkWhere(query);

    const [taskCount, rawOutputGroups] = await this.prisma.$transaction([
      this.prisma.lessonTask.count(),
      this.prisma.lessonOutput.groupBy({
        by: ['status'] as const,
        where: workWhere,
        orderBy: {
          status: 'asc',
        },
        _count: true,
      }),
    ]);
    const outputGroups = rawOutputGroups as unknown as LessonOutputStatusGroup[];

    const pendingOutputCount =
      outputGroups.find((group) => group.status === LessonOutputStatus.pending)
        ?._count ?? 0;
    const completedOutputCount =
      outputGroups.find((group) => group.status === LessonOutputStatus.completed)
        ?._count ?? 0;
    const cancelledOutputCount =
      outputGroups.find((group) => group.status === LessonOutputStatus.cancelled)
        ?._count ?? 0;
    const outputCount =
      pendingOutputCount + completedOutputCount + cancelledOutputCount;

    const outputMeta = this.buildListMeta(outputCount, requestedPage, limit);
    const outputs = await this.prisma.lessonOutput.findMany({
      where: workWhere,
      skip: (outputMeta.page - 1) * outputMeta.limit,
      take: outputMeta.limit,
      orderBy: [{ updatedAt: 'desc' }, { date: 'desc' }, { lessonName: 'asc' }],
      include: this.lessonOutputInclude,
    });

    return {
      summary: {
        taskCount,
        outputCount,
        pendingOutputCount,
        completedOutputCount,
        cancelledOutputCount,
      },
      outputs: outputs.map((output) => this.mapWorkOutputItem(output)),
      outputsMeta: outputMeta,
    };
  }

  async createResource(
    data: CreateLessonResourceDto,
    auditActor?: ActionHistoryActor,
  ): Promise<LessonResourceResponseDto> {
    const title = this.requireNonEmptyValue(data.title, 'title');
    const resourceLink = this.requireNonEmptyValue(
      data.resourceLink,
      'resourceLink',
    );
    const description = toTrimmedString(data.description);
    const tags = normalizeTags(data.tags);

    return this.prisma.$transaction(async (tx) => {
      const createdResource = await tx.lessonResource.create({
        data: {
          title,
          resourceLink,
          description,
          tags,
          createdBy: auditActor?.userId ?? null,
        },
      });

      if (auditActor) {
        await this.actionHistoryService.recordCreate(tx, {
          actor: auditActor,
          entityType: 'lesson_resource',
          entityId: createdResource.id,
          description: 'Tạo tài nguyên giáo án',
          afterValue: createdResource,
        });
      }

      return this.mapResource(createdResource);
    });
  }

  async updateResource(
    id: string,
    data: UpdateLessonResourceDto,
    auditActor?: ActionHistoryActor,
  ): Promise<LessonResourceResponseDto> {
    const existingResource = await this.prisma.lessonResource.findUnique({
      where: { id },
    });

    if (!existingResource) {
      throw new NotFoundException('Lesson resource not found');
    }

    const updateData: Prisma.LessonResourceUpdateInput = {};

    if (data.title !== undefined) {
      updateData.title = this.requireNonEmptyValue(data.title, 'title');
    }

    if (data.resourceLink !== undefined) {
      updateData.resourceLink = this.requireNonEmptyValue(
        data.resourceLink,
        'resourceLink',
      );
    }

    if (data.description !== undefined) {
      updateData.description = toTrimmedString(data.description);
    }

    if (data.tags !== undefined) {
      updateData.tags = normalizeTags(data.tags);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedResource = await tx.lessonResource.update({
        where: { id },
        data: updateData,
      });

      if (auditActor) {
        await this.actionHistoryService.recordUpdate(tx, {
          actor: auditActor,
          entityType: 'lesson_resource',
          entityId: id,
          description: 'Cập nhật tài nguyên giáo án',
          beforeValue: existingResource,
          afterValue: updatedResource,
        });
      }

      return this.mapResource(updatedResource);
    });
  }

  async deleteResource(id: string, auditActor?: ActionHistoryActor) {
    const existingResource = await this.prisma.lessonResource.findUnique({
      where: { id },
    });

    if (!existingResource) {
      throw new NotFoundException('Lesson resource not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const deletedResource = await tx.lessonResource.delete({
        where: { id },
      });

      if (auditActor) {
        await this.actionHistoryService.recordDelete(tx, {
          actor: auditActor,
          entityType: 'lesson_resource',
          entityId: id,
          description: 'Xóa tài nguyên giáo án',
          beforeValue: existingResource,
        });
      }

      return deletedResource;
    });
  }

  async createTask(
    data: CreateLessonTaskDto,
    auditActor?: ActionHistoryActor,
  ): Promise<LessonTaskResponseDto> {
    const title = this.requireNonEmptyValue(data.title, 'title');
    const description = toTrimmedString(data.description);
    const status = data.status ?? LessonTaskStatus.pending;
    const priority = data.priority ?? LessonTaskPriority.medium;
    const dueDate = toDateOnlyOrNull(data.dueDate);

    return this.prisma.$transaction(async (tx) => {
      const createdByStaffId =
        data.createdByStaffId !== undefined
          ? await this.resolveCreatedByStaffId(tx, data.createdByStaffId)
          : await this.resolveActorStaffId(tx, auditActor?.userId);
      const assignedStaffIds = await this.resolveAssignedStaffIds(
        tx,
        data.assignedStaffIds,
      );

      const createdTask = await tx.lessonTask.create({
        data: {
          title,
          description,
          status,
          priority,
          dueDate,
          createdBy: createdByStaffId,
        },
      });

      await this.syncTaskAssignments(tx, createdTask.id, assignedStaffIds);

      const afterTask = await this.getTaskSnapshot(tx, createdTask.id);
      const afterValue = afterTask
        ? await this.hydrateTaskRecord(tx, afterTask)
        : null;

      if (auditActor) {
        await this.actionHistoryService.recordCreate(tx, {
          actor: auditActor,
          entityType: 'lesson_task',
          entityId: createdTask.id,
          description: 'Tạo công việc giáo án',
          afterValue,
        });
      }

      return this.mapTaskFromSnapshot(afterValue);
    });
  }

  async updateTask(
    id: string,
    data: UpdateLessonTaskDto,
    auditActor?: ActionHistoryActor,
  ): Promise<LessonTaskResponseDto> {
    const existingTaskRecord = await this.getTaskSnapshot(this.prisma, id);
    const existingTask = existingTaskRecord
      ? await this.hydrateTaskRecord(this.prisma, existingTaskRecord)
      : null;

    if (!existingTask) {
      throw new NotFoundException('Lesson task not found');
    }

    const updateData: Prisma.LessonTaskUpdateInput = {};

    if (data.title !== undefined) {
      updateData.title = this.requireNonEmptyValue(data.title, 'title');
    }

    if (data.description !== undefined) {
      updateData.description = toTrimmedString(data.description);
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }

    if (data.dueDate !== undefined) {
      updateData.dueDate = toDateOnlyOrNull(data.dueDate);
    }

    return this.prisma.$transaction(async (tx) => {
      const assignedStaffIds =
        data.assignedStaffIds !== undefined
          ? await this.resolveAssignedStaffIds(tx, data.assignedStaffIds)
          : undefined;
      const createdByStaffId =
        data.createdByStaffId !== undefined
          ? await this.resolveCreatedByStaffId(tx, data.createdByStaffId)
          : undefined;

      if (createdByStaffId !== undefined) {
        updateData.createdByStaff = createdByStaffId
          ? {
              connect: { id: createdByStaffId },
            }
          : {
              disconnect: true,
            };
      }

      await tx.lessonTask.update({
        where: { id },
        data: updateData,
      });

      if (assignedStaffIds !== undefined) {
        await this.syncTaskAssignments(tx, id, assignedStaffIds);
      }

      const afterTaskRecord = await this.getTaskSnapshot(tx, id);
      const afterValue = afterTaskRecord
        ? await this.hydrateTaskRecord(tx, afterTaskRecord)
        : null;

      if (!afterValue) {
        throw new NotFoundException('Lesson task not found');
      }

      if (auditActor) {
        await this.actionHistoryService.recordUpdate(tx, {
          actor: auditActor,
          entityType: 'lesson_task',
          entityId: id,
          description: 'Cập nhật công việc giáo án',
          beforeValue: existingTask,
          afterValue,
        });
      }

      return this.mapTaskFromSnapshot(afterValue);
    });
  }

  async deleteTask(id: string, auditActor?: ActionHistoryActor) {
    const existingTaskRecord = await this.getTaskSnapshot(this.prisma, id);
    const existingTask = existingTaskRecord
      ? await this.hydrateTaskRecord(this.prisma, existingTaskRecord)
      : null;

    if (!existingTask) {
      throw new NotFoundException('Lesson task not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const deletedTask = await tx.lessonTask.delete({
        where: { id },
      });

      if (auditActor) {
        await this.actionHistoryService.recordDelete(tx, {
          actor: auditActor,
          entityType: 'lesson_task',
          entityId: id,
          description: 'Xóa công việc giáo án',
          beforeValue: existingTask,
        });
      }

      return deletedTask;
    });
  }

  async createOutput(
    data: CreateLessonOutputDto,
    auditActor?: ActionHistoryActor,
  ): Promise<LessonOutputResponseDto> {
    const lessonTaskId = await this.resolveOptionalLessonOutputTaskId(
      this.prisma,
      data.lessonTaskId,
    );
    const lessonName = this.requireNonEmptyValue(data.lessonName, 'lessonName');
    const originalTitle = toTrimmedString(data.originalTitle);
    const source = toTrimmedString(data.source);
    const originalLink = toTrimmedString(data.originalLink);
    const level = toTrimmedString(data.level);
    const tags = normalizeTags(data.tags);
    const cost = this.resolveOutputCost(data.cost);
    const date = this.requireDateOnly(data.date, 'date');
    const contestUploaded = toTrimmedString(data.contestUploaded);
    const link = toTrimmedString(data.link);
    const status = data.status ?? LessonOutputStatus.pending;

    return this.prisma.$transaction(async (tx) => {
      const staffId = await this.resolveLessonOutputStaffId(tx, data.staffId);

      const createdOutput = await tx.lessonOutput.create({
        data: {
          lessonTaskId,
          lessonName,
          originalTitle,
          source,
          originalLink,
          level,
          tags,
          cost,
          date,
          contestUploaded,
          link,
          staffId,
          status,
        },
        include: this.lessonOutputInclude,
      });

      if (auditActor) {
        await this.actionHistoryService.recordCreate(tx, {
          actor: auditActor,
          entityType: 'lesson_output',
          entityId: createdOutput.id,
          description: 'Tạo lesson output',
          afterValue: this.mapOutput(createdOutput),
        });
      }

      return this.mapOutput(createdOutput);
    });
  }

  async updateOutput(
    id: string,
    data: UpdateLessonOutputDto,
    auditActor?: ActionHistoryActor,
  ): Promise<LessonOutputResponseDto> {
    const existingOutput = await this.getOutputSnapshot(this.prisma, id);
    if (!existingOutput) {
      throw new NotFoundException('Lesson output not found');
    }

    const updateData: Prisma.LessonOutputUpdateInput = {};

    if (data.lessonTaskId !== undefined) {
      const lessonTaskId = await this.resolveOptionalLessonOutputTaskId(
        this.prisma,
        data.lessonTaskId,
      );
      updateData.lessonTask = lessonTaskId
        ? {
            connect: { id: lessonTaskId },
          }
        : {
            disconnect: true,
          };
    }

    if (data.lessonName !== undefined) {
      updateData.lessonName = this.requireNonEmptyValue(
        data.lessonName,
        'lessonName',
      );
    }

    if (data.originalTitle !== undefined) {
      updateData.originalTitle = toTrimmedString(data.originalTitle);
    }

    if (data.source !== undefined) {
      updateData.source = toTrimmedString(data.source);
    }

    if (data.originalLink !== undefined) {
      updateData.originalLink = toTrimmedString(data.originalLink);
    }

    if (data.level !== undefined) {
      updateData.level = toTrimmedString(data.level);
    }

    if (data.tags !== undefined) {
      updateData.tags = normalizeTags(data.tags);
    }

    if (data.cost !== undefined) {
      updateData.cost = this.resolveOutputCost(data.cost);
    }

    if (data.date !== undefined) {
      updateData.date = this.requireDateOnly(data.date, 'date');
    }

    if (data.contestUploaded !== undefined) {
      updateData.contestUploaded = toTrimmedString(data.contestUploaded);
    }

    if (data.link !== undefined) {
      updateData.link = toTrimmedString(data.link);
    }

    if (data.staffId !== undefined) {
      const staffId = await this.resolveLessonOutputStaffId(
        this.prisma,
        data.staffId,
      );

      updateData.staff = staffId
        ? {
            connect: { id: staffId },
          }
        : {
            disconnect: true,
          };
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOutput = await tx.lessonOutput.update({
        where: { id },
        data: updateData,
        include: this.lessonOutputInclude,
      });

      if (auditActor) {
        await this.actionHistoryService.recordUpdate(tx, {
          actor: auditActor,
          entityType: 'lesson_output',
          entityId: id,
          description: 'Cập nhật lesson output',
          beforeValue: this.mapOutput(existingOutput),
          afterValue: this.mapOutput(updatedOutput),
        });
      }

      return this.mapOutput(updatedOutput);
    });
  }

  async deleteOutput(id: string, auditActor?: ActionHistoryActor) {
    const existingOutput = await this.getOutputSnapshot(this.prisma, id);
    if (!existingOutput) {
      throw new NotFoundException('Lesson output not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const deletedOutput = await tx.lessonOutput.delete({
        where: { id },
      });

      if (auditActor) {
        await this.actionHistoryService.recordDelete(tx, {
          actor: auditActor,
          entityType: 'lesson_output',
          entityId: id,
          description: 'Xóa lesson output',
          beforeValue: this.mapOutput(existingOutput),
        });
      }

      return deletedOutput;
    });
  }

  async getTaskById(id: string): Promise<LessonTaskDetailResponseDto> {
    const taskRecord = await this.getTaskSnapshot(this.prisma, id);
    const task = taskRecord
      ? await this.hydrateTaskRecord(this.prisma, taskRecord)
      : null;

    if (!task) {
      throw new NotFoundException('Lesson task not found');
    }

    const [outputs, resources] = await this.prisma.$transaction([
      this.prisma.lessonOutput.findMany({
        where: { lessonTaskId: id },
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
        orderBy: [
          { date: 'desc' },
          { updatedAt: 'desc' },
          { lessonName: 'asc' },
        ],
      }),
      this.prisma.lessonResource.findMany({
        where: { lessonTaskId: id },
        select: {
          id: true,
          title: true,
          resourceLink: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    return this.mapTaskDetail(task, outputs, resources);
  }

  async getOutputById(id: string): Promise<LessonOutputResponseDto> {
    const output = await this.getOutputSnapshot(this.prisma, id);
    if (!output) {
      throw new NotFoundException('Lesson output not found');
    }

    return this.mapOutput(output);
  }

  async searchTaskStaffOptions(
    query: LessonTaskStaffOptionsQueryDto = {},
  ): Promise<LessonTaskStaffOptionDto[]> {
    const limit = Math.min(this.resolveLimit(query.limit, 3), 3);
    const trimmedSearch = query.search?.trim();

    const staff = await this.prisma.staffInfo.findMany({
      where: {
        roles: {
          hasSome: [...LESSON_TASK_ASSIGNABLE_ROLES],
        },
        ...(trimmedSearch
          ? {
              fullName: {
                contains: trimmedSearch,
                mode: 'insensitive',
              },
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        roles: true,
        status: true,
      },
      orderBy: [{ status: 'asc' }, { fullName: 'asc' }],
      take: limit,
    });

    return staff.map((item) => ({
      id: item.id,
      fullName: item.fullName,
      roles: item.roles,
      status: item.status,
    }));
  }

  async searchOutputStaffOptions(
    query: LessonOutputStaffOptionsQueryDto = {},
  ): Promise<LessonOutputStaffOptionDto[]> {
    const limit = Math.min(this.resolveLimit(query.limit, 6), 12);
    const trimmedSearch = query.search?.trim();

    const staff = await this.prisma.staffInfo.findMany({
      where: trimmedSearch
        ? {
            fullName: {
              contains: trimmedSearch,
              mode: 'insensitive',
            },
          }
        : undefined,
      select: {
        id: true,
        fullName: true,
        roles: true,
        status: true,
      },
      orderBy: [{ status: 'asc' }, { fullName: 'asc' }],
      take: limit,
    });

    return staff.map((item) => ({
      id: item.id,
      fullName: item.fullName,
      roles: item.roles,
      status: item.status,
    }));
  }

  private readonly lessonOutputInclude = {
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
  } satisfies Prisma.LessonOutputInclude;

  private requireNonEmptyValue(
    value: string,
    field: 'title' | 'resourceLink' | 'lessonName',
  ) {
    const normalized = toTrimmedString(value);
    if (!normalized) {
      throw new BadRequestException(`${field} là bắt buộc.`);
    }

    return normalized;
  }

  private mapResource(resource: {
    id: string;
    title: string | null;
    description: string | null;
    resourceLink: string;
    tags: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): LessonResourceResponseDto {
    return {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      resourceLink: resource.resourceLink,
      tags: parseJsonStringArray(resource.tags),
      createdAt: resource.createdAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
    };
  }

  private mapResourcePreview(resource: LessonResourcePreviewDto) {
    return {
      id: resource.id,
      title: resource.title,
      resourceLink: resource.resourceLink,
    } satisfies LessonResourcePreviewDto;
  }

  private mapTaskDetail(
    task: HydratedLessonTaskRecord,
    outputs: LessonOutputRecord[],
    resources: LessonResourcePreviewDto[],
  ): LessonTaskDetailResponseDto {
    const mappedTask = this.mapTask(task);
    const outputProgress = this.buildOutputProgress(outputs);

    return {
      ...mappedTask,
      outputs: outputs.map((output) => this.mapTaskOutputListItem(output)),
      outputProgress,
      resourcePreview: resources.map((resource) =>
        this.mapResourcePreview(resource),
      ),
      contestUploadedSummary: this.buildContestUploadedSummary(outputs),
    };
  }

  private mapTaskOutputListItem(
    output: Pick<
      LessonOutputRecord,
      'id' | 'lessonName' | 'contestUploaded' | 'date' | 'staffId' | 'status'
    > & {
      staff: LessonOutputRecord['staff'];
    },
  ): LessonTaskOutputListItemDto {
    return {
      id: output.id,
      lessonName: output.lessonName,
      contestUploaded: output.contestUploaded,
      date: output.date.toISOString().slice(0, 10),
      staffId: output.staffId,
      staffDisplayName: output.staff?.fullName ?? null,
      status: output.status,
    };
  }

  private mapWorkOutputItem(
    output: LessonOutputRecord,
  ): LessonWorkOutputItemDto {
    return {
      ...this.mapTaskOutputListItem(output),
      updatedAt: output.updatedAt.toISOString(),
      task: this.mapOutputTask(output.lessonTask),
      tags: parseJsonStringArray(output.tags),
      level: output.level,
      link: output.link,
      originalLink: output.originalLink,
      cost: output.cost,
    };
  }

  /** Lọc `lesson_outputs.date` (theo ngày) trong khoảng [start, end] của tháng (UTC). */
  private buildLessonOutputMonthWhere(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));
    return {
      date: {
        gte: start,
        lte: end,
      },
    } satisfies Prisma.LessonOutputWhereInput;
  }

  /**
   * Nếu có `dateFrom` + `dateTo` hợp lệ → lọc khoảng ngày (thay lọc tháng).
   * Ngược lại, nếu có `year` + `month` → lọc theo tháng.
   */
  private buildLessonOutputTimeFilter(
    query: LessonWorkQueryDto,
  ): Prisma.LessonOutputWhereInput | undefined {
    const from = query.dateFrom?.trim();
    const to = query.dateTo?.trim();
    if (from && to) {
      const d1 = new Date(`${from}T00:00:00.000Z`);
      const d2 = new Date(`${to}T00:00:00.000Z`);
      if (
        !Number.isNaN(d1.getTime()) &&
        !Number.isNaN(d2.getTime()) &&
        d1 <= d2
      ) {
        return {
          date: {
            gte: d1,
            lte: d2,
          },
        };
      }
    }

    if (
      typeof query.year === 'number' &&
      typeof query.month === 'number' &&
      query.month >= 1 &&
      query.month <= 12
    ) {
      return this.buildLessonOutputMonthWhere(query.year, query.month);
    }

    return undefined;
  }

  private buildWorkWhere(
    query: LessonWorkQueryDto,
  ): Prisma.LessonOutputWhereInput | undefined {
    const parts: Prisma.LessonOutputWhereInput[] = [];
    const timeFilter = this.buildLessonOutputTimeFilter(query);
    if (timeFilter) {
      parts.push(timeFilter);
    }

    const search = query.search?.trim();
    if (search) {
      parts.push({
        OR: [
          { lessonName: { contains: search, mode: 'insensitive' } },
          { contestUploaded: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const tag = query.tag?.trim();
    if (tag) {
      parts.push({
        OR: [
          { lessonName: { contains: tag, mode: 'insensitive' } },
          { contestUploaded: { contains: tag, mode: 'insensitive' } },
        ],
      });
    }

    if (query.staffId) {
      parts.push({ staffId: query.staffId });
    }

    if (query.outputStatus && query.outputStatus !== 'all') {
      parts.push({
        status: query.outputStatus as LessonOutputStatus,
      });
    }

    const levelKey = query.level?.trim();
    if (levelKey && /^[0-5]$/.test(levelKey)) {
      parts.push({
        OR: [
          { level: { equals: `Level ${levelKey}`, mode: 'insensitive' } },
          { level: { equals: levelKey, mode: 'insensitive' } },
        ],
      });
    }

    if (parts.length === 0) {
      return undefined;
    }
    if (parts.length === 1) {
      return parts[0];
    }
    return { AND: parts };
  }

  private mapOutput(output: LessonOutputRecord): LessonOutputResponseDto {
    return {
      id: output.id,
      lessonTaskId: output.lessonTaskId,
      lessonName: output.lessonName,
      originalTitle: output.originalTitle,
      source: output.source,
      originalLink: output.originalLink,
      level: output.level,
      tags: parseJsonStringArray(output.tags),
      cost: output.cost,
      date: output.date.toISOString().slice(0, 10),
      contestUploaded: output.contestUploaded,
      link: output.link,
      staffId: output.staffId,
      staff: this.mapOutputStaff(output.staff),
      status: output.status,
      task: this.mapOutputTask(output.lessonTask),
      createdAt: output.createdAt.toISOString(),
      updatedAt: output.updatedAt.toISOString(),
    };
  }

  private mapOutputStaff(
    staff: LessonOutputRecord['staff'],
  ): LessonOutputStaffDto | null {
    if (!staff) {
      return null;
    }

    return {
      id: staff.id,
      fullName: staff.fullName,
      roles: staff.roles,
      status: staff.status,
    };
  }

  private mapOutputTask(
    task: LessonOutputRecord['lessonTask'],
  ): LessonOutputTaskSummaryDto | null {
    if (!task) {
      return null;
    }

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
    };
  }

  private buildContestUploadedSummary(
    outputs: Array<{
      contestUploaded: string | null;
    }>,
  ) {
    return Array.from(
      new Set(
        outputs
          .map((output) => toTrimmedString(output.contestUploaded))
          .filter((value): value is string => value !== null),
      ),
    );
  }

  private buildOutputProgress(
    outputs: Array<{
      status: LessonOutputStatus;
    }>,
  ): LessonTaskOutputProgressDto {
    return outputs.reduce(
      (summary, output) => {
        summary.total += 1;
        if (output.status === LessonOutputStatus.completed) {
          summary.completed += 1;
        }

        return summary;
      },
      {
        total: 0,
        completed: 0,
      } satisfies LessonTaskOutputProgressDto,
    );
  }

  private resolvePage(value: number | undefined) {
    if (!Number.isInteger(value) || (value as number) < 1) {
      return 1;
    }

    return value as number;
  }

  private resolveLimit(value: number | undefined, fallback: number) {
    if (!Number.isInteger(value) || (value as number) < 1) {
      return fallback;
    }

    return Math.min(value as number, 100);
  }

  private buildListMeta(total: number, requestedPage: number, limit: number) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, totalPages);

    return {
      total,
      page,
      limit,
      totalPages,
    };
  }

  private requireDateOnly(value: string, field: 'date') {
    const normalized = toDateOnlyOrNull(value);
    if (!normalized) {
      throw new BadRequestException(`${field} không hợp lệ.`);
    }

    return normalized;
  }

  private resolveOutputCost(value: number | null | undefined) {
    if (value == null) {
      return 0;
    }

    if (!Number.isInteger(value) || value < 0) {
      throw new BadRequestException('cost không hợp lệ.');
    }

    return value;
  }

  private mapTask(task: {
    id: string;
    title: string | null;
    description: string | null;
    status: LessonTaskStatus;
    priority: LessonTaskPriority;
    dueDate: Date | null;
    createdByStaff: LessonTaskCreatorDto | null;
    assignees: LessonTaskAssigneeDto[];
  }): LessonTaskResponseDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
      createdByStaff: task.createdByStaff
        ? {
            id: task.createdByStaff.id,
            fullName: task.createdByStaff.fullName,
            roles: task.createdByStaff.roles,
            status: task.createdByStaff.status,
          }
        : null,
      assignees: task.assignees.map((assignee) => ({
        id: assignee.id,
        fullName: assignee.fullName,
        roles: assignee.roles,
        status: assignee.status,
      })),
    };
  }

  private mapTaskFromSnapshot(task: HydratedLessonTaskRecord | null) {
    if (!task) {
      throw new NotFoundException('Lesson task not found');
    }

    return this.mapTask(task);
  }

  private async resolveActorStaffId(
    db: Prisma.TransactionClient | PrismaService,
    userId?: string | null,
  ) {
    if (!userId) {
      return null;
    }

    const staff = await db.staffInfo.findUnique({
      where: { userId },
      select: { id: true },
    });

    return staff?.id ?? null;
  }

  private async resolveCreatedByStaffId(
    db: Prisma.TransactionClient | PrismaService,
    staffId: string | null | undefined,
  ) {
    if (staffId == null) {
      return null;
    }

    const normalizedStaffId = String(staffId).trim();
    if (!normalizedStaffId) {
      return null;
    }

    const staff = await db.staffInfo.findFirst({
      where: {
        id: normalizedStaffId,
        roles: {
          hasSome: [...LESSON_TASK_ASSIGNABLE_ROLES],
        },
      },
      select: {
        id: true,
      },
    });

    if (!staff) {
      throw new BadRequestException(
        'Chỉ được gán người phụ trách có role giáo án hoặc trưởng giáo án.',
      );
    }

    return staff.id;
  }

  private async hydrateTaskRecords(
    db: Prisma.TransactionClient | PrismaService,
    tasks: LessonTaskRecord[],
  ) {
    const creatorMap = await this.getTaskCreatorMap(
      db,
      tasks
        .map((task) => task.createdBy)
        .filter((value): value is string => typeof value === 'string'),
    );

    return tasks.map((task) => ({
      ...task,
      createdByStaff: task.createdBy
        ? (creatorMap.get(task.createdBy) ?? null)
        : null,
      assignees: this.mapTaskAssignees(task.staffLessonTasks),
    }));
  }

  private async hydrateTaskRecord(
    db: Prisma.TransactionClient | PrismaService,
    task: LessonTaskRecord,
  ): Promise<HydratedLessonTaskRecord> {
    const creatorMap = await this.getTaskCreatorMap(
      db,
      task.createdBy ? [task.createdBy] : [],
    );

    return {
      ...task,
      createdByStaff: task.createdBy
        ? (creatorMap.get(task.createdBy) ?? null)
        : null,
      assignees: this.mapTaskAssignees(task.staffLessonTasks),
    };
  }

  private mapTaskAssignees(
    taskAssignees: LessonTaskRecord['staffLessonTasks'],
  ) {
    return taskAssignees
      .map((assignment) => ({
        id: assignment.staff.id,
        fullName: assignment.staff.fullName,
        roles: assignment.staff.roles,
        status: assignment.staff.status,
      }))
      .sort((left, right) => {
        if (left.status !== right.status) {
          return left.status.localeCompare(right.status);
        }

        return left.fullName.localeCompare(right.fullName, 'vi');
      });
  }

  private async getTaskCreatorMap(
    db: Prisma.TransactionClient | PrismaService,
    creatorIds: string[],
  ) {
    const uniqueCreatorIds = Array.from(new Set(creatorIds));
    if (uniqueCreatorIds.length === 0) {
      return new Map<string, LessonTaskCreatorDto>();
    }

    const creators = await db.staffInfo.findMany({
      where: {
        id: {
          in: uniqueCreatorIds,
        },
      },
      select: {
        id: true,
        fullName: true,
        roles: true,
        status: true,
      },
    });

    return new Map<string, LessonTaskCreatorDto>(
      creators.map((creator) => [
        creator.id,
        {
          id: creator.id,
          fullName: creator.fullName,
          roles: creator.roles,
          status: creator.status,
        },
      ]),
    );
  }

  private getTaskSnapshot(
    db: Prisma.TransactionClient | PrismaService,
    id: string,
  ) {
    return db.lessonTask.findUnique({
      where: { id },
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
  }

  private getOutputSnapshot(
    db: Prisma.TransactionClient | PrismaService,
    id: string,
  ) {
    return db.lessonOutput.findUnique({
      where: { id },
      include: this.lessonOutputInclude,
    });
  }

  private async resolveAssignedStaffIds(
    db: Prisma.TransactionClient | PrismaService,
    staffIds: string[] | null | undefined,
  ) {
    if (!Array.isArray(staffIds)) {
      return [];
    }

    const normalizedStaffIds = Array.from(
      new Set(
        staffIds
          .map((staffId) => String(staffId).trim())
          .filter((staffId) => staffId.length > 0),
      ),
    );

    if (normalizedStaffIds.length === 0) {
      return [];
    }

    if (normalizedStaffIds.length > 3) {
      throw new BadRequestException(
        'Mỗi công việc chỉ được gắn tối đa 3 nhân sự.',
      );
    }

    const existingStaff = await db.staffInfo.findMany({
      where: {
        id: {
          in: normalizedStaffIds,
        },
        roles: {
          hasSome: [...LESSON_TASK_ASSIGNABLE_ROLES],
        },
      },
      select: {
        id: true,
      },
    });

    const existingStaffIdSet = new Set(existingStaff.map((staff) => staff.id));
    if (existingStaff.length !== normalizedStaffIds.length) {
      throw new BadRequestException(
        'Chỉ được gắn nhân sự có role giáo án hoặc trưởng giáo án.',
      );
    }

    return normalizedStaffIds.filter((staffId) =>
      existingStaffIdSet.has(staffId),
    );
  }

  private async resolveOptionalLessonOutputTaskId(
    db: Prisma.TransactionClient | PrismaService,
    lessonTaskId: string | null | undefined,
  ): Promise<string | null> {
    const normalizedTaskId = toTrimmedString(lessonTaskId);
    if (!normalizedTaskId) {
      return null;
    }

    const task = await db.lessonTask.findUnique({
      where: { id: normalizedTaskId },
      select: { id: true },
    });

    if (!task) {
      throw new BadRequestException('Lesson task không tồn tại.');
    }

    return task.id;
  }

  private async resolveLessonOutputStaffId(
    db: Prisma.TransactionClient | PrismaService,
    staffId: string | null | undefined,
  ) {
    const normalizedStaffId = toTrimmedString(staffId);
    if (!normalizedStaffId) {
      return null;
    }

    const staff = await db.staffInfo.findUnique({
      where: { id: normalizedStaffId },
      select: { id: true },
    });

    if (!staff) {
      throw new BadRequestException('Nhân sự của lesson output không tồn tại.');
    }

    return staff.id;
  }

  private async syncTaskAssignments(
    db: Prisma.TransactionClient | PrismaService,
    lessonTaskId: string,
    nextStaffIds: string[],
  ) {
    const currentAssignments = await db.staffLessonTask.findMany({
      where: { lessonTaskId },
      select: { staffId: true },
    });

    const currentStaffIds = currentAssignments.map(
      (assignment) => assignment.staffId,
    );
    const currentStaffIdSet = new Set(currentStaffIds);
    const nextStaffIdSet = new Set(nextStaffIds);
    const staffIdsToCreate = nextStaffIds.filter(
      (staffId) => !currentStaffIdSet.has(staffId),
    );
    const staffIdsToDelete = currentStaffIds.filter(
      (staffId) => !nextStaffIdSet.has(staffId),
    );

    if (staffIdsToDelete.length > 0) {
      await db.staffLessonTask.deleteMany({
        where: {
          lessonTaskId,
          staffId: {
            in: staffIdsToDelete,
          },
        },
      });
    }

    if (staffIdsToCreate.length > 0) {
      await db.staffLessonTask.createMany({
        data: staffIdsToCreate.map((staffId) => ({
          lessonTaskId,
          staffId,
        })),
      });
    }
  }
}
