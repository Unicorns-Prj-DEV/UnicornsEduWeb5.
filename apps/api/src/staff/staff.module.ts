import { PrismaModule } from "src/prisma/prisma.module";
import { StaffService } from "./staff.service";
import { Module } from "@nestjs/common";
import { StaffController } from "./staff.controller";

@Module({
    imports: [PrismaModule],
    controllers: [StaffController],
    providers: [StaffService],
    exports: [StaffService],
})
export class StaffModule { }