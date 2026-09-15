"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isSubmitting?: boolean;
};

export default function LessonDeleteConfirmPopup({
  open,
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  isSubmitting = false,
}: Props) {
  return (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      onClose={onClose}
      onConfirm={onConfirm}
      isSubmitting={isSubmitting}
      labelledBy="lesson-delete-popup-title"
    />
  );
}
