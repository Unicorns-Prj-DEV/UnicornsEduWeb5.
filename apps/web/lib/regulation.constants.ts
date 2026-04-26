import type { RegulationAudience } from "@/dtos/regulation.dto";
import { ROLE_LABELS } from "./staff.constants";

export const REGULATION_AUDIENCE_LABELS: Record<RegulationAudience, string> = {
  all: "Tất cả",
  student: "Học sinh",
  staff_admin: ROLE_LABELS.admin,
  staff_teacher: ROLE_LABELS.teacher,
  staff_assistant: ROLE_LABELS.assistant,
  staff_lesson_plan: ROLE_LABELS.lesson_plan,
  staff_lesson_plan_head: ROLE_LABELS.lesson_plan_head,
  staff_accountant: ROLE_LABELS.accountant,
  staff_communication: ROLE_LABELS.communication,
  staff_technical: ROLE_LABELS.technical,
  staff_customer_care: ROLE_LABELS.customer_care,
};

export const REGULATION_AUDIENCE_OPTIONS: Array<{
  value: RegulationAudience;
  label: string;
}> = [
  { value: "all", label: REGULATION_AUDIENCE_LABELS.all },
  { value: "student", label: REGULATION_AUDIENCE_LABELS.student },
  { value: "staff_teacher", label: REGULATION_AUDIENCE_LABELS.staff_teacher },
  { value: "staff_assistant", label: REGULATION_AUDIENCE_LABELS.staff_assistant },
  { value: "staff_lesson_plan", label: REGULATION_AUDIENCE_LABELS.staff_lesson_plan },
  {
    value: "staff_lesson_plan_head",
    label: REGULATION_AUDIENCE_LABELS.staff_lesson_plan_head,
  },
  { value: "staff_accountant", label: REGULATION_AUDIENCE_LABELS.staff_accountant },
  {
    value: "staff_communication",
    label: REGULATION_AUDIENCE_LABELS.staff_communication,
  },
  {
    value: "staff_technical",
    label: REGULATION_AUDIENCE_LABELS.staff_technical,
  },
  {
    value: "staff_customer_care",
    label: REGULATION_AUDIENCE_LABELS.staff_customer_care,
  },
  { value: "staff_admin", label: REGULATION_AUDIENCE_LABELS.staff_admin },
];
