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
