import { StaffListResponse, StaffStatus } from '@/dtos/staff.dto';
import { StaffDetail } from '@/dtos/staff.dto';
import { CreateUserPayload, UpdateUserPayload } from '@/dtos/user.dto';
import { api } from '../client';

export async function getUsers() {
    const response = await api.get('/users');
    return response.data;
}

export async function getUserById(id: string) {
    const safeId = encodeURIComponent(id);
    const response = await api.get(`/users/${safeId}`);
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
    const safeId = encodeURIComponent(id);
    const response = await api.delete(`/users/${safeId}`);
    return response.data;
}

/** StaffInfo list (bảng staff_info): GET /staff */
export async function getStaff(params: {
    page: number;
    limit: number;
    search?: string;
    status?: "" | StaffStatus;
    province?: string;
    university?: string;
    highSchool?: string;
}): Promise<StaffListResponse> {
    const response = await api.get("/staff", {
        params: {
            page: params.page,
            limit: params.limit,
            ...(params.search ? { search: params.search } : {}),
            ...(params.status ? { status: params.status } : {}),
            ...(params.province ? { province: params.province } : {}),
            ...(params.university ? { university: params.university } : {}),
            ...(params.highSchool ? { highSchool: params.highSchool } : {}),
        },
    });

    const payload = response.data as StaffListResponse;
    return {
        data: Array.isArray(payload?.data) ? payload.data : [],
        meta: {
            total: payload?.meta?.total ?? 0,
            page: payload?.meta?.page ?? params.page,
            limit: payload?.meta?.limit ?? params.limit,
        },
    };
}

/** Chi tiết một nhân sự: GET /staff/:id */
export async function getStaffById(id: string): Promise<StaffDetail> {
    const safeId = encodeURIComponent(id);
    const response = await api.get(`/staff/${safeId}`);
    return response.data;
}

/** Xóa bản ghi staff (StaffInfo) theo id */
export async function deleteStaffById(id: string) {
    const safeId = encodeURIComponent(id);
    const response = await api.delete(`/staff/${safeId}`);
    return response.data;
}
