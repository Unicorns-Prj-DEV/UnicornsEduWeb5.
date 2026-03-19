
export type StaffStatus = "active" | "inactive";

export interface StaffListMeta {
    total: number;
    page: number;
    limit: number;
}

export interface StaffListResponse {
    data: StaffListItem[];
    meta: StaffListMeta;
}

export interface StaffListItem {
    id: string;
    fullName: string;
    status: StaffStatus;
    roles?: string[];
    user?: { province?: string | null } | null;
    classTeachers?: Array<{ class: { id: string; name: string } }>;
    monthlyStats?: Array<{ totalUnpaidAll?: number | null }>;
}

export interface StaffClassAllowanceItem {
    class_id: string;
    teacher_payment_status: string;
    total_allowance: number | string;
    name: string;
}

export interface StaffDetail {
    id: string;
    fullName: string;
    birthDate?: string | null;
    university?: string | null;
    highSchool?: string | null;
    specialization?: string | null;
    bankAccount?: string | null;
    bankQrLink?: string | null;
    roles: string[];
    status: StaffStatus;
    createdAt?: string;
    updatedAt?: string;
    user?: {
        id: string;
        email: string;
        province?: string | null;
    } | null;
    classTeachers?: Array<{ class: { id: string; name: string } }>;
    monthlyStats?: Array<{ month: string; totalUnpaidAll?: number | null }>;
    classAllowance?: StaffClassAllowanceItem[];
}

export interface StaffAssignableUser {
    id: string;
    email: string;
    accountHandle: string;
    province?: string | null;
    roleType: string;
    status: string;
    fullName?: string | null;
    hasStaffProfile: boolean;
    staffId?: string | null;
    isEligible: boolean;
    ineligibleReason?: string | null;
}

export interface StaffIncomeAmountSummary {
    total: number;
    paid: number;
    unpaid: number;
}

export interface StaffIncomeClassSummary extends StaffIncomeAmountSummary {
    classId: string;
    className: string;
}

export interface StaffIncomeRoleSummary extends StaffIncomeAmountSummary {
    role: string;
    label: string;
}

export interface StaffIncomeSummary {
    recentUnpaidDays: number;
    sessionMonthlyTotals: StaffIncomeAmountSummary;
    sessionYearTotal: number;
    classMonthlySummaries: StaffIncomeClassSummary[];
    bonusMonthlyTotals: StaffIncomeAmountSummary;
    otherRoleSummaries: StaffIncomeRoleSummary[];
}

export interface CreateStaffPayload {
    full_name: string;
    birth_date?: string;
    university?: string;
    high_school?: string;
    specialization?: string;
    bank_account?: string;
    bank_qr_link?: string;
    roles: string[];
    user_id: string;
}

export interface StaffInfoDto {
    id: string;
    fullname: string;
    birthdate: Date;
    university: string;
    high_school: string;
    specialization: string;
    bank_account: string;
    bank_qr_link: string;
    status: StaffStatus;
}
