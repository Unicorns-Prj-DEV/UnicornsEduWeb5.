import { ApiProperty, PartialType } from '@nestjs/swagger';
import { StaffRole } from 'generated/enums';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ example: 'Nguyen Van B' })
  @IsString()
  full_name: string;

  @ApiProperty({ example: '1998-01-01' })
  @IsDateString()
  birth_date: string;

  @ApiProperty({ example: 'HCMUT' })
  @IsString()
  university: string;

  @ApiProperty({ example: 'Le Hong Phong' })
  @IsString()
  high_school: string;

  @ApiProperty({ example: 'Math' })
  @IsString()
  specialization: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  bank_account: string;

  @ApiProperty({ example: 'https://example.com/qr.png' })
  @IsString()
  bank_qr_link: string;

  @ApiProperty({ enum: StaffRole, isArray: true })
  @IsArray()
  @IsEnum(StaffRole, { each: true })
  roles: StaffRole[];

  @ApiProperty({ description: 'User id' })
  @IsUUID()
  user_id: string;
}

export class UpdateStaffDto extends PartialType(CreateStaffDto) {
  @ApiProperty({ description: 'Staff id' })
  @IsUUID()
  id: string;
}
