import type {
  CreateLessonOutputPayload,
  CreateLessonResourcePayload,
  CreateLessonTaskPayload,
  LessonOutputItem,
  LessonOutputListItem,
  LessonOutputStaff,
  LessonOutputStaffOption,
  LessonOutputTaskSummary,
  LessonOverviewQueryParams,
  LessonOverviewResponse,
  LessonResourceItem,
  LessonResourcePreview,
  LessonTaskAssignee,
  LessonTaskDetail,
  LessonTaskItem,
  LessonTaskStaffOption,
  LessonWorkQueryParams,
  LessonWorkOutputItem,
  LessonWorkResponse,
  UpdateLessonOutputPayload,
  UpdateLessonResourcePayload,
  UpdateLessonTaskPayload,
} from "@/dtos/lesson.dto";
import { api } from "../client";

function normalizeLessonStaffReference(
  value:
    | Partial<LessonTaskAssignee>
    | Partial<LessonTaskStaffOption>
    | Partial<LessonOutputStaff>
    | Partial<LessonOutputStaffOption>
    | undefined,
) {
  if (!value?.id || !value?.fullName) {
    return null;
  }

  const status: "active" | "inactive" =
    value.status === "inactive" ? "inactive" : "active";

  return {
    id: value.id,
    fullName: value.fullName,
    roles: Array.isArray(value.roles) ? value.roles : [],
    status,
  };
}

function normalizeLessonTask(
  value: Partial<LessonTaskItem> | undefined,
): LessonTaskItem {
  return {
    id: value?.id ?? "",
    title: value?.title ?? null,
    description: value?.description ?? null,
    status: value?.status ?? "pending",
    priority: value?.priority ?? "medium",
    dueDate: value?.dueDate ?? null,
    createdByStaff: normalizeLessonStaffReference(
      value?.createdByStaff ?? undefined,
    ),
    assignees: Array.isArray(value?.assignees)
      ? value.assignees
          .map((item) => normalizeLessonStaffReference(item))
          .filter((item): item is LessonTaskAssignee => item !== null)
      : [],
  };
}

function normalizeLessonTaskStaffOption(
  value: Partial<LessonTaskStaffOption> | undefined,
): LessonTaskStaffOption | null {
  return normalizeLessonStaffReference(value) as LessonTaskStaffOption | null;
}

function normalizeLessonOutputStaffOption(
  value: Partial<LessonOutputStaffOption> | undefined,
): LessonOutputStaffOption | null {
  return normalizeLessonStaffReference(value) as LessonOutputStaffOption | null;
}

function normalizeLessonResourcePreview(
  value: Partial<LessonResourcePreview> | undefined,
): LessonResourcePreview | null {
  if (!value?.id || !value?.resourceLink) {
    return null;
  }

  return {
    id: value.id,
    title: value.title ?? null,
    resourceLink: value.resourceLink,
  };
}

function normalizeLessonOutputListItem(
  value: Partial<LessonOutputListItem> | undefined,
): LessonOutputListItem | null {
  if (!value?.id || !value?.lessonName) {
    return null;
  }

  return {
    id: value.id,
    lessonName: value.lessonName,
    contestUploaded: value.contestUploaded ?? null,
    date: value.date ?? "",
    staffId: value.staffId ?? null,
    staffDisplayName: value.staffDisplayName ?? null,
    status:
      value.status === "completed" || value.status === "cancelled"
        ? value.status
        : "pending",
  };
}

function normalizeLessonTaskDetail(
  value: Partial<LessonTaskDetail> | undefined,
): LessonTaskDetail {
  const baseTask = normalizeLessonTask(value);

  return {
    ...baseTask,
    outputs: Array.isArray(value?.outputs)
      ? value.outputs
          .map((item) => normalizeLessonOutputListItem(item))
          .filter((item): item is LessonOutputListItem => item !== null)
      : [],
    outputProgress: {
      total: value?.outputProgress?.total ?? 0,
      completed: value?.outputProgress?.completed ?? 0,
    },
    resourcePreview: Array.isArray(value?.resourcePreview)
      ? value.resourcePreview
          .map((item) => normalizeLessonResourcePreview(item))
          .filter((item): item is LessonResourcePreview => item !== null)
      : [],
    contestUploadedSummary: Array.isArray(value?.contestUploadedSummary)
      ? value.contestUploadedSummary
          .map((item) => String(item).trim())
          .filter(Boolean)
      : [],
  };
}

function normalizeLessonOutputTaskSummary(
  value: Partial<LessonOutputTaskSummary> | undefined,
): LessonOutputTaskSummary | null {
  if (!value?.id) {
    return null;
  }

  return {
    id: value.id,
    title: value.title ?? null,
    status: value.status ?? "pending",
    priority: value.priority ?? "medium",
  };
}

function normalizeLessonOutputItem(
  value: Partial<LessonOutputItem> | undefined,
): LessonOutputItem {
  return {
    id: value?.id ?? "",
    lessonTaskId: value?.lessonTaskId ?? null,
    lessonName: value?.lessonName ?? "",
    originalTitle: value?.originalTitle ?? null,
    source: value?.source ?? null,
    originalLink: value?.originalLink ?? null,
    level: value?.level ?? null,
    tags: Array.isArray(value?.tags)
      ? value.tags.map((item) => String(item).trim()).filter(Boolean)
      : [],
    cost:
      typeof value?.cost === "number" && Number.isFinite(value.cost)
        ? value.cost
        : 0,
    date: value?.date ?? "",
    contestUploaded: value?.contestUploaded ?? null,
    link: value?.link ?? null,
    staffId: value?.staffId ?? null,
    staff: normalizeLessonStaffReference(value?.staff ?? undefined),
    status:
      value?.status === "completed" || value?.status === "cancelled"
        ? value.status
        : "pending",
    task: normalizeLessonOutputTaskSummary(value?.task ?? undefined),
    createdAt: value?.createdAt ?? "",
    updatedAt: value?.updatedAt ?? "",
  };
}

function normalizeLessonWorkOutputItem(
  value: Partial<LessonWorkOutputItem> | undefined,
): LessonWorkOutputItem | null {
  const baseOutput = normalizeLessonOutputListItem(value);
  if (!baseOutput) {
    return null;
  }

  return {
    ...baseOutput,
    updatedAt: value?.updatedAt ?? "",
    task: normalizeLessonOutputTaskSummary(value?.task ?? undefined),
    tags: Array.isArray(value?.tags)
      ? value.tags.map((item) => String(item).trim()).filter(Boolean)
      : [],
    level: value?.level ?? null,
    link: value?.link ?? null,
    originalLink: value?.originalLink ?? null,
    cost:
      typeof value?.cost === "number" && Number.isFinite(value.cost)
        ? value.cost
        : 0,
  };
}

export async function getLessonOverview(
  params: LessonOverviewQueryParams,
): Promise<LessonOverviewResponse> {
  const response = await api.get("/lesson-overview", {
    params: {
      resourcePage: params.resourcePage,
      resourceLimit: params.resourceLimit,
      taskPage: params.taskPage,
      taskLimit: params.taskLimit,
    },
  });
  const payload = response.data as Partial<LessonOverviewResponse> | undefined;

  return {
    summary: {
      resourceCount: payload?.summary?.resourceCount ?? 0,
      taskCount: payload?.summary?.taskCount ?? 0,
      openTaskCount: payload?.summary?.openTaskCount ?? 0,
      completedTaskCount: payload?.summary?.completedTaskCount ?? 0,
    },
    resources: Array.isArray(payload?.resources) ? payload.resources : [],
    resourcesMeta: {
      total: payload?.resourcesMeta?.total ?? 0,
      page: payload?.resourcesMeta?.page ?? params.resourcePage,
      limit: payload?.resourcesMeta?.limit ?? params.resourceLimit,
      totalPages: payload?.resourcesMeta?.totalPages ?? 1,
    },
    tasks: Array.isArray(payload?.tasks)
      ? payload.tasks.map((task) => normalizeLessonTask(task))
      : [],
    tasksMeta: {
      total: payload?.tasksMeta?.total ?? 0,
      page: payload?.tasksMeta?.page ?? params.taskPage,
      limit: payload?.tasksMeta?.limit ?? params.taskLimit,
      totalPages: payload?.tasksMeta?.totalPages ?? 1,
    },
  };
}

export async function getLessonWork(
  params: LessonWorkQueryParams,
): Promise<LessonWorkResponse> {
  const response = await api.get("/lesson-work", {
    params: {
      page: params.page,
      limit: params.limit,
      ...(typeof params.year === "number" && typeof params.month === "number"
        ? { year: params.year, month: params.month }
        : {}),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(params.tag?.trim() ? { tag: params.tag.trim() } : {}),
      ...(params.staffId?.trim() ? { staffId: params.staffId.trim() } : {}),
      ...(params.outputStatus &&
      params.outputStatus !== "all" &&
      params.outputStatus.trim()
        ? { outputStatus: params.outputStatus.trim() }
        : {}),
      ...(params.dateFrom?.trim() ? { dateFrom: params.dateFrom.trim() } : {}),
      ...(params.dateTo?.trim() ? { dateTo: params.dateTo.trim() } : {}),
      ...(params.level && /^[0-5]$/.test(params.level.trim())
        ? { level: params.level.trim() }
        : {}),
    },
  });
  const payload = response.data as Partial<LessonWorkResponse> | undefined;

  return {
    summary: {
      taskCount: payload?.summary?.taskCount ?? 0,
      outputCount: payload?.summary?.outputCount ?? 0,
      pendingOutputCount: payload?.summary?.pendingOutputCount ?? 0,
      completedOutputCount: payload?.summary?.completedOutputCount ?? 0,
      cancelledOutputCount: payload?.summary?.cancelledOutputCount ?? 0,
    },
    outputs: Array.isArray(payload?.outputs)
      ? payload.outputs
          .map((output) => normalizeLessonWorkOutputItem(output))
          .filter((output): output is LessonWorkOutputItem => output !== null)
      : [],
    outputsMeta: {
      total: payload?.outputsMeta?.total ?? 0,
      page: payload?.outputsMeta?.page ?? params.page,
      limit: payload?.outputsMeta?.limit ?? params.limit,
      totalPages: payload?.outputsMeta?.totalPages ?? 1,
    },
  };
}

export async function createLessonResource(
  data: CreateLessonResourcePayload,
): Promise<LessonResourceItem> {
  const response = await api.post("/lesson-resources", data);
  return response.data as LessonResourceItem;
}

export async function updateLessonResource(
  id: string,
  data: UpdateLessonResourcePayload,
): Promise<LessonResourceItem> {
  const response = await api.patch(
    `/lesson-resources/${encodeURIComponent(id)}`,
    data,
  );
  return response.data as LessonResourceItem;
}

export async function deleteLessonResource(id: string) {
  const response = await api.delete(
    `/lesson-resources/${encodeURIComponent(id)}`,
  );
  return response.data;
}

export async function createLessonTask(
  data: CreateLessonTaskPayload,
): Promise<LessonTaskItem> {
  const response = await api.post("/lesson-tasks", data);
  return normalizeLessonTask(response.data as Partial<LessonTaskItem>);
}

export async function getLessonTaskById(id: string): Promise<LessonTaskDetail> {
  const response = await api.get(`/lesson-tasks/${encodeURIComponent(id)}`);
  return normalizeLessonTaskDetail(response.data as Partial<LessonTaskDetail>);
}

export async function updateLessonTask(
  id: string,
  data: UpdateLessonTaskPayload,
): Promise<LessonTaskItem> {
  const response = await api.patch(
    `/lesson-tasks/${encodeURIComponent(id)}`,
    data,
  );
  return normalizeLessonTask(response.data as Partial<LessonTaskItem>);
}

export async function deleteLessonTask(id: string) {
  const response = await api.delete(`/lesson-tasks/${encodeURIComponent(id)}`);
  return response.data;
}

export async function createLessonOutput(
  data: CreateLessonOutputPayload,
): Promise<LessonOutputItem> {
  const response = await api.post("/lesson-outputs", data);
  return normalizeLessonOutputItem(response.data as Partial<LessonOutputItem>);
}

export async function getLessonOutputById(id: string): Promise<LessonOutputItem> {
  const response = await api.get(`/lesson-outputs/${encodeURIComponent(id)}`);
  return normalizeLessonOutputItem(response.data as Partial<LessonOutputItem>);
}

export async function updateLessonOutput(
  id: string,
  data: UpdateLessonOutputPayload,
): Promise<LessonOutputItem> {
  const response = await api.patch(
    `/lesson-outputs/${encodeURIComponent(id)}`,
    data,
  );
  return normalizeLessonOutputItem(response.data as Partial<LessonOutputItem>);
}

export async function deleteLessonOutput(id: string) {
  const response = await api.delete(
    `/lesson-outputs/${encodeURIComponent(id)}`,
  );
  return response.data;
}

export async function searchLessonTaskStaffOptions(params: {
  search?: string;
  limit?: number;
}): Promise<LessonTaskStaffOption[]> {
  const response = await api.get("/lesson-task-staff-options", {
    params: {
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(typeof params.limit === "number" ? { limit: params.limit } : {}),
    },
  });

  return Array.isArray(response.data)
    ? response.data
        .map((item) =>
          normalizeLessonTaskStaffOption(
            item as Partial<LessonTaskStaffOption> | undefined,
          ),
        )
        .filter((item): item is LessonTaskStaffOption => item !== null)
    : [];
}

export async function searchLessonOutputStaffOptions(params: {
  search?: string;
  limit?: number;
}): Promise<LessonOutputStaffOption[]> {
  const response = await api.get("/lesson-output-staff-options", {
    params: {
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(typeof params.limit === "number" ? { limit: params.limit } : {}),
    },
  });

  return Array.isArray(response.data)
    ? response.data
        .map((item) =>
          normalizeLessonOutputStaffOption(
            item as Partial<LessonOutputStaffOption> | undefined,
          ),
        )
        .filter((item): item is LessonOutputStaffOption => item !== null)
    : [];
}
