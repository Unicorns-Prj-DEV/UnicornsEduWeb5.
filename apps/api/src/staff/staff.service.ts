import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateStaffDto, UpdateStaffDto } from "src/dtos/staff.dto";
import { PrismaService } from "src/prisma/prisma.service";



@Injectable()
export class StaffService {
    constructor(private readonly prisma: PrismaService) { }

    async getStaff() {
        return await this.prisma.staffInfo.findMany();
    }

    async updateStaff(data: UpdateStaffDto) {
        return await this.prisma.staffInfo.update({
            where: {
                id: data.id,
            },
            data: {
                ...data,
            },
        });
    }

    async deleteStaff(id: string) {
        return await this.prisma.staffInfo.delete({
            where: {
                id,
            },
        });
    }
    async createStaff(data: CreateStaffDto) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: data.user_id,
            },
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return await this.prisma.staffInfo.create({
            data: {
                fullName: data.full_name,
                birthDate: data.birth_date,
                university: data.university,
                highSchool: data.high_school,
                specialization: data.specialization,
                bankAccount: data.bank_account,
                bankQrLink: data.bank_qr_link,
                roles: data.roles,
                userId: data.user_id,
            },
        });
    }

}