"use client";

import { useState } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import AddTutorPopup from "@/components/admin/staff/AddTutorPopup";
import { cn } from "@/lib/utils";

type Props = {
  /** Query cần làm mới sau khi tạo (danh sách nhân sự của trang đang mở). */
  invalidateQueryKeys?: readonly QueryKey[];
  className?: string;
};

/**
 * 14/11: nút «Tạo nhân sự» cho 3 role trưởng (Trưởng phòng Sale & CSKH,
 * Trưởng ban Đào tạo, Trưởng ban Chuyên môn). Mở `AddTutorPopup` ẩn role
 * trưởng; backend (`POST /staff`) vẫn chặn Admin / role trưởng / mức %.
 */
export default function HeadCreateStaffButton({
  invalidateQueryKeys = [],
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:w-auto sm:py-2",
          className,
        )}
      >
        <UserPlus className="size-4 shrink-0" aria-hidden />
        Tạo nhân sự
      </button>
      <AddTutorPopup
        open={open}
        onClose={() => setOpen(false)}
        canAssignHeadRoles={false}
        onCreated={async () => {
          await Promise.all(
            invalidateQueryKeys.map((queryKey) =>
              queryClient.invalidateQueries({ queryKey }),
            ),
          );
        }}
      />
    </>
  );
}
