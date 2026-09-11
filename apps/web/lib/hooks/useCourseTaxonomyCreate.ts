"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/client";
import * as classApi from "@/lib/apis/class.api";
import { courseKeys } from "@/lib/query-keys";

type CreateOption = {
  onCreateOption?: (label: string) => Promise<void>;
  createOptionLabel?: (query: string) => string;
};

/**
 * Cho phép tạo chủ đề (chapter) ngay trong `UpgradedSelect`.
 * Trả về object rỗng khi chưa chọn khoá — select sẽ không hiện mục "Tạo …".
 */
export function useChapterCreateOption(
  courseId: string | undefined,
  onCreated: (chapterId: string, title: string) => void,
): CreateOption {
  const queryClient = useQueryClient();

  const onCreateOption = useCallback(
    async (title: string) => {
      if (!courseId) return;
      try {
        const res = await api.post<{ id: string }>(
          `/course/${courseId}/chapters`,
          { courseId, title },
        );
        await queryClient.invalidateQueries({
          queryKey: courseKeys.chapters(courseId),
        });
        onCreated(res.data.id, title);
        toast.success("Đã tạo chủ đề mới.");
      } catch {
        toast.error("Không thể tạo chủ đề.");
      }
    },
    [courseId, onCreated, queryClient],
  );

  if (!courseId) return {};
  return {
    onCreateOption,
    createOptionLabel: (query) => `Tạo chủ đề “${query}”`,
  };
}

/** Cho phép tạo mức độ khó ngay trong `UpgradedSelect`. */
export function useDifficultyCreateOption(
  courseId: string | undefined,
  onCreated: (difficultyLevelId: string, name: string) => void,
): CreateOption {
  const queryClient = useQueryClient();

  const onCreateOption = useCallback(
    async (name: string) => {
      if (!courseId) return;
      try {
        const created = await classApi.createCourseDifficultyLevel(courseId, {
          name,
        });
        await queryClient.invalidateQueries({
          queryKey: courseKeys.difficultyLevelsPrefix(courseId),
        });
        onCreated(created.id, created.name);
        toast.success("Đã tạo độ khó mới.");
      } catch {
        toast.error("Không thể tạo độ khó.");
      }
    },
    [courseId, onCreated, queryClient],
  );

  if (!courseId) return {};
  return {
    onCreateOption,
    createOptionLabel: (query) => `Tạo độ khó “${query}”`,
  };
}
