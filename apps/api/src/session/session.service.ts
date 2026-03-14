import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { SessionCreateDto } from "src/dtos/session.dto";


@Injectable()
export class SessionService {
    constructor(private readonly prisma: PrismaService) { }

    async createSession(data: SessionCreateDto) {
        const session = await this.prisma.session.create({
            data: data,
        });

        return session;
    }

    async getSessionsByClassId(classId: string) {
        const sessions = await this.prisma.session.findMany({
            where: {
                classId,
            },
            include: {
                teacher: true,
            },
            orderBy: {
                date: "desc",
            },
        });

        return sessions;
    }

    async getSessionsByTeacherId(teacherId: string) {
        const sessions = await this.prisma.session.findMany({
            where: {
                teacherId,
            },
        });

        return sessions;
    }
}