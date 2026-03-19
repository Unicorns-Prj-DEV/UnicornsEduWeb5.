
import { StaffInfoDto, StaffStatus } from "./staff.dto";

export type ClassStatus = "running" | "ended";
export type ClassType = "vip" | "basic" | "advance" | "hardcore";

export interface ClassScheduleItem {
    from: string;
    to: string;
}

export interface ClassListItem {
    id: string;
    name: string;
    type: ClassType;
    status: ClassStatus;
    studentCount?: number;
    maxStudents: number;
    allowancePerSessionPerStudent: number;
    maxAllowancePerSession?: number | null;
    scaleAmount?: number | null;
    schedule?: ClassScheduleItem[];
    studentTuitionPerSession?: number | null;
    tuitionPackageTotal?: number | null;
    tuitionPackageSession?: number | null;
    teachers?: ClassTeacher[];
    createdAt: string;
    updatedAt: string;
}

export interface ClassListMeta {
    total: number;
    page: number;
    limit: number;
}

export interface ClassListResponse {
    data: ClassListItem[];
    meta: ClassListMeta;
}

export interface ClassTeacher {
    id: string;
    fullName: string;
    status?: StaffStatus;
    /** Custom allowance for this teacher in this class (VNĐ). From class_teachers.custom_allowance. */
    customAllowance?: number | null;
}

export type ClassStudentStatus = "active" | "inactive" | "drop_out" | string;

export interface ClassStudent {
    id: string;
    fullName: string;
    status?: ClassStudentStatus;
    customTuitionPerSession?: number | null;
    customTuitionPackageTotal?: number | null;
    customTuitionPackageSession?: number | null;
    effectiveTuitionPerSession?: number | null;
    effectiveTuitionPackageTotal?: number | null;
    effectiveTuitionPackageSession?: number | null;
    tuitionPackageSource?: "custom" | "class" | "unset";
    totalAttendedSession?: number | null;
}

export interface ClassDetail extends ClassListItem {
    teachers?: ClassTeacher[];
    students?: ClassStudent[];
    sessionTuitionTotal?: number | null;
}

export interface CreateClassPayload {
    name: string;
    type?: ClassType;
    status?: ClassStatus;
    max_students?: number;
    allowance_per_session_per_student?: number;
    max_allowance_per_session?: number;
    scale_amount?: number;
    schedule?: ClassScheduleItem[];
    student_tuition_per_session?: number;
    tuition_package_total?: number;
    tuition_package_session?: number;
    teacher_ids?: string[];
    /** Teachers with optional custom allowance. Takes precedence over teacher_ids when both sent. */
    teachers?: { teacher_id: string; custom_allowance?: number }[];
    student_ids?: string[];
}

export interface UpdateClassPayload {
    id: string;
    name?: string;
    type?: ClassType;
    status?: ClassStatus;
    max_students?: number;
    allowance_per_session_per_student?: number;
    max_allowance_per_session?: number;
    scale_amount?: number;
    schedule?: ClassScheduleItem[];
    student_tuition_per_session?: number;
    tuition_package_total?: number;
    tuition_package_session?: number;
    teacher_ids?: string[];
    teachers?: { teacher_id: string; custom_allowance?: number }[];
    student_ids?: string[];
}

/** Payload for PATCH /class/:id/basic-info */
export interface UpdateClassBasicInfoPayload {
    name?: string;
    type?: ClassType;
    status?: ClassStatus;
    max_students?: number;
    allowance_per_session_per_student?: number;
    max_allowance_per_session?: number;
    scale_amount?: number;
    student_tuition_per_session?: number;
    tuition_package_total?: number;
    tuition_package_session?: number;
}

/** Payload for PATCH /class/:id/teachers */
export interface UpdateClassTeachersPayload {
    teachers: { teacher_id: string; custom_allowance?: number }[];
}

/** Payload for PATCH /class/:id/schedule */
export interface UpdateClassSchedulePayload {
    schedule: ClassScheduleItem[];
}

/** Payload for PATCH /class/:id/students */
export interface UpdateClassStudentItemPayload {
    id: string;
    custom_tuition_per_session?: number;
    custom_tuition_package_total?: number;
    custom_tuition_package_session?: number;
}

/** Payload for PATCH /class/:id/students */
export interface UpdateClassStudentsPayload {
    students: UpdateClassStudentItemPayload[];
}

export interface ClassListItemDto {
    id: string;
    name: string;
    status: ClassStatus;
    type: ClassType;
    studentCount?: number;
    maxStudents?: number;
    createdAt: Date;
    updatedAt: Date;
    teachers: StaffInfoDto[];
}
