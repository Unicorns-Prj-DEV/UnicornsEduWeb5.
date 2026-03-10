import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateStudentDto, UpdateStudentDto } from "src/dtos/student.dto";
import { PrismaService } from "src/prisma/prisma.service";



@Injectable()
export class StudentService {
    constructor(private readonly prisma: PrismaService) { }

    async getStudents() {
        return await this.prisma.studentInfo.findMany();
    }

    async getStudentById(id: string) {
        return await this.prisma.studentInfo.findUnique({
            where: {
                id,
            },
        });
    }

    async updateStudent(data: UpdateStudentDto) {
        return await this.prisma.studentInfo.update({
            where: {
                id: data.id,
            },
            data: {
                ...data,
            },
        });
    }

    async deleteStudent(id: string) {
        return await this.prisma.studentInfo.delete({
            where: {
                id,
            },
        });
    }

    async createStudent(data: CreateStudentDto) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: data.user_id,
            },
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return await this.prisma.studentInfo.create({
            data: {
                fullName: data.full_name,
                email: data.email,
                school: data.school,
                province: data.province,
                birthYear: data.birth_year,
                parentName: data.parent_name,
                parentPhone: data.parent_phone,
                status: data.status,
                gender: data.gender,
                goal: data.goal,
                userId: data.user_id,
            },
        });
    }
}