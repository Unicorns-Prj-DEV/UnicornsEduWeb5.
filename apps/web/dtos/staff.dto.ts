
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
    user?: { province?: string | null } | null;
    classTeachers?: Array<{ class: { id: string; name: string } }>;
    monthlyStats?: Array<{ totalUnpaidAll?: number | null }>;
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