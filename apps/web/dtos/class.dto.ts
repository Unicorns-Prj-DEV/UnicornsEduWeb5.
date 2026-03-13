
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
    maxStudents: number;
    allowancePerSessionPerStudent: number;
    maxAllowancePerSession?: number | null;
    scaleAmount?: number | null;
    schedule?: ClassScheduleItem[];
    studentTuitionPerSession?: number | null;
    tuitionPackageTotal?: number | null;
    tuitionPackageSession?: number | null;
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
}

export interface ClassDetail extends ClassListItem {
    teachers?: ClassTeacher[];
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
}

export interface ClassListItemDto {
    id: string;
    name: string;
    status: ClassStatus;
    type: ClassType;
    createdAt: Date;
    updatedAt: Date;
    teachers: StaffInfoDto[];
}