"use client";

import { LessonManageDetailsPage } from "@/app/admin/lesson-manage-details/page";

export default function StaffLessonManageDetailsPage() {
  return (
    <LessonManageDetailsPage
      basePagePath="/staff/lesson-plans"
      manageDetailsPath="/staff/lesson-manage-details"
    />
  );
}
