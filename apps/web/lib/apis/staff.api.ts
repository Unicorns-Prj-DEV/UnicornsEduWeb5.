import { api } from '../client';

interface CreateUserPayload {
    email: string;
    phone: string;
    password: string;
    name: string;
    roleType: string;
    province: string;
    accountHandle: string;
}

interface UpdateUserPayload {
    id: string;
    email?: string;
    phone?: string;
    name?: string;
    roleType?: string;
    status?: string;
    linkId?: string;
    province?: string;
    accountHandle?: string;
    emailVerified?: boolean;
    phoneVerified?: boolean;
}

export async function getUsers() {
    const response = await api.get('/users');
    return response.data;
}

export async function getUserById(id: string) {
    const response = await api.get(`/users/${id}`);
    return response.data;
}

export async function createUser(data: CreateUserPayload) {
    const response = await api.post('/users', data);
    return response.data;
}

export async function updateUser(data: UpdateUserPayload) {
    const response = await api.patch('/users', data);
    return response.data;
}

export async function deleteUser(id: string) {
    const response = await api.delete(`/users/${id}`);
    return response.data;
}

export type StaffStatus = "active" | "inactive";

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

/** StaffInfo list (bảng staff_info): GET /staff */
export async function getStaff(): Promise<StaffListItem[]> {
    const response = await api.get("/staff");
    return Array.isArray(response.data) ? response.data : [];
}

/** Chi tiết một nhân sự: GET /staff/:id */
export async function getStaffById(id: string): Promise<StaffDetail> {
    const response = await api.get(`/staff/${id}`);
    return response.data;
}

/** Xóa bản ghi staff (StaffInfo) theo id */
export async function deleteStaffById(id: string) {
    const response = await api.delete(`/staff/${id}`);
    return response.data;
}
