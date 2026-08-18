"use client";

import { useQuery } from "@tanstack/react-query";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import * as classApi from "@/lib/apis/class.api";
import { classCategoryKeys } from "@/lib/query-keys";

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  /** Admin-only: also show deactivated categories (they stay disabled in the list). */
  includeInactive?: boolean;
  buttonClassName?: string;
  labelId?: string;
};

/** Dropdown chọn phân loại lớp, lấy danh sách động từ GET /class-categories (quản lý tại trang Phân loại lớp). */
export default function ClassCategorySelect({
  value,
  onValueChange,
  id,
  name,
  disabled,
  includeInactive = false,
  buttonClassName,
  labelId,
}: Props) {
  const { data: categories = [] } = useQuery({
    queryKey: classCategoryKeys.list(includeInactive),
    queryFn: () => classApi.getClassCategories(includeInactive),
  });

  return (
    <UpgradedSelect
      id={id}
      name={name}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      placeholder="Chọn phân loại"
      emptyStateLabel="Chưa có phân loại lớp nào."
      labelId={labelId}
      options={categories.map((category) => ({
        value: category.id,
        label: category.isActive ? category.name : `${category.name} (đã ẩn)`,
        disabled: !category.isActive,
      }))}
      buttonClassName={buttonClassName}
    />
  );
}
