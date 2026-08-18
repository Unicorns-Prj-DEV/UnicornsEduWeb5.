"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as classApi from "@/lib/apis/class.api";
import { ClassCategoryFormPopup, type ClassCategoryFormValues } from "@/components/admin/class";
import { Switch } from "@/components/ui/switch";
import { classCategoryKeys, classKeys } from "@/lib/query-keys";
import { runBackgroundSave } from "@/lib/mutation-feedback";
import type { ClassCategory } from "@/dtos/class.dto";

export default function ClassCategoriesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ClassCategory | null>(null);

  const {
    data: categories = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: classCategoryKeys.list(true),
    queryFn: () => classApi.getClassCategories(true),
  });

  const invalidateCategoryData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: classCategoryKeys.all }),
      queryClient.invalidateQueries({ queryKey: classKeys.all }),
    ]);
  };

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      classApi.updateClassCategory(id, { is_active: isActive }),
    onSuccess: invalidateCategoryData,
  });

  const openCreateForm = () => {
    setEditingCategory(null);
    setFormOpen(true);
  };

  const openEditForm = (category: ClassCategory) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleSubmit = async (values: ClassCategoryFormValues) => {
    setFormOpen(false);
    if (editingCategory) {
      runBackgroundSave({
        loadingMessage: "Đang cập nhật phân loại lớp...",
        successMessage: "Đã cập nhật phân loại lớp.",
        errorMessage: "Không thể cập nhật phân loại lớp.",
        action: () =>
          classApi.updateClassCategory(editingCategory.id, {
            name: values.name,
            sort_order: values.sortOrder,
          }),
        onSuccess: invalidateCategoryData,
      });
      return;
    }

    runBackgroundSave({
      loadingMessage: "Đang thêm phân loại lớp...",
      successMessage: "Đã thêm phân loại lớp.",
      errorMessage: "Không thể thêm phân loại lớp.",
      action: () =>
        classApi.createClassCategory({
          name: values.name,
          sort_order: values.sortOrder,
        }),
      onSuccess: invalidateCategoryData,
    });
  };

  const handleToggleActive = (category: ClassCategory, nextActive: boolean) => {
    toggleActiveMutation.mutate({ id: category.id, isActive: nextActive });
  };

  const handleDelete = (category: ClassCategory) => {
    if (!window.confirm(`Xoá phân loại "${category.name}"? Hành động này không thể hoàn tác.`)) {
      return;
    }
    runBackgroundSave({
      loadingMessage: "Đang xoá phân loại lớp...",
      successMessage: "Đã xoá phân loại lớp.",
      errorMessage: "Không thể xoá phân loại lớp.",
      action: () => classApi.deleteClassCategory(category.id),
      onSuccess: invalidateCategoryData,
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:rounded-lg sm:p-5">
        <section className="relative mb-4 overflow-hidden rounded-2xl border border-border-default bg-gradient-to-br from-bg-secondary via-bg-surface to-bg-secondary/70 p-4 sm:p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-10 left-16 size-28 rounded-full bg-warning/10 blur-2xl" aria-hidden />

          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Link
                href="/admin/classes"
                className="mb-1 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Lớp học
              </Link>
              <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">Phân loại lớp</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Thêm, sửa, ẩn hoặc xoá các loại phân loại lớp dùng khi tạo lớp học.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateForm}
              className="self-end inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse shadow-sm transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface sm:min-h-10 sm:self-auto"
            >
              <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Thêm phân loại</span>
            </button>
          </div>
        </section>

        <div className="min-w-0 flex-1 overflow-auto">
          {isLoading ? (
            <p className="p-4 text-sm text-text-secondary">Đang tải...</p>
          ) : isError ? (
            <div className="p-4 text-sm text-error">
              Không tải được danh sách phân loại lớp.{" "}
              <button type="button" onClick={() => refetch()} className="underline">
                Thử lại
              </button>
            </div>
          ) : categories.length === 0 ? (
            <p className="p-4 text-sm text-text-secondary">Chưa có phân loại lớp nào.</p>
          ) : (
            <ul className="space-y-2">
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="flex flex-col gap-3 rounded-lg border border-border-default bg-bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-text-primary">{category.name}</span>
                      {!category.isActive ? (
                        <span className="rounded bg-error/10 px-1.5 py-0.5 text-xs text-error">
                          Đã ẩn
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">Thứ tự: {category.sortOrder}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
                    <label className="flex items-center gap-2 text-xs text-text-secondary">
                      <span>Hoạt động</span>
                      <Switch
                        checked={category.isActive}
                        onCheckedChange={(next) => handleToggleActive(category, next)}
                        disabled={toggleActiveMutation.isPending}
                        aria-label={`Bật/tắt hoạt động cho ${category.name}`}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => openEditForm(category)}
                      className="rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(category)}
                      className="rounded-md border border-error/30 bg-bg-surface px-3 py-1.5 text-xs font-medium text-error transition-colors duration-200 hover:bg-error/10"
                    >
                      Xoá
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ClassCategoryFormPopup
        open={formOpen}
        category={editingCategory}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
