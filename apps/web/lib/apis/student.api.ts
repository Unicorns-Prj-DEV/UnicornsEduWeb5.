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
