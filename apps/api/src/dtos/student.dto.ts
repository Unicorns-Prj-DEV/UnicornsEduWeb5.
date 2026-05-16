import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  Gender,
  StudentStatus,
  StudentWalletDirectTopUpRequestStatus,
  UserRole,
  WalletTransactionType,
} from 'generated/enums';
import { PaginationQueryDto } from './pagination.dto';

export class SearchAssignableStudentUsersDto {
  @ApiProperty({
    description: 'Full or partial email to search existing users',
    example: 'student@example.com',
  })
  @IsString()
  @MinLength(2)
  email: string;
}

export class StudentListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'Nguyễn',
    description: 'Search by student full name (case-insensitive)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'THPT ABC',
    description: 'Filter by school name (contains, case-insensitive)',
  })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiPropertyOptional({
    example: 'TP.HCM',
    description: 'Filter by province (contains, case-insensitive)',
  })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({
    enum: StudentStatus,
    description: 'Filter by student status',
  })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({
    enum: Gender,
    description: 'Filter by gender',
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    example: 'Toán 8A',
    description: 'Filter by class name (contains, case-insensitive)',
  })
  @IsOptional()
  @IsString()
  className?: string;
}

export class UpdateStudentBodyDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn B' })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiPropertyOptional({ example: 'student@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'THPT ABC' })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiPropertyOptional({ example: 'TP.HCM' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ example: 2010 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  birth_year?: number;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  @IsOptional()
  @IsString()
  parent_name?: string;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsOptional()
  @IsString()
  parent_phone?: string;

  @ApiPropertyOptional({ example: 'parent@example.com', nullable: true })
  @IsOptional()
  @IsEmail()
  parent_email?: string | null;

  @ApiPropertyOptional({ enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: 'Đạt IELTS 7.0' })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ example: '2026-03-10' })
  @IsOptional()
  @IsDateString()
  drop_out_date?: string;

  @ApiPropertyOptional({
    example: '20bf3b10-a7a1-43da-bbd2-f7a1d55b5ca7',
    description: 'Assigned customer care staff ID. Set null to clear.',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  customer_care_staff_id?: string | null;

  @ApiPropertyOptional({
    example: 0.2,
    description:
      'Customer care profit coefficient stored in CustomerCareService (0.00 - 0.99).',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(0.99)
  customer_care_profit_percent?: number | null;
}

export class CreateStudentDto {
  @ApiProperty({ example: 'Nguyễn Văn B' })
  @IsString()
  full_name: string;

  @ApiPropertyOptional({ example: 'student@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'THPT ABC' })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiPropertyOptional({ example: 'TP.HCM' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ example: 2010 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  birth_year?: number;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  @IsOptional()
  @IsString()
  parent_name?: string;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsOptional()
  @IsString()
  parent_phone?: string;

  @ApiPropertyOptional({ example: 'parent@example.com', nullable: true })
  @IsOptional()
  @IsEmail()
  parent_email?: string | null;

  @ApiPropertyOptional({ enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: 'Đạt IELTS 7.0' })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ example: '2026-03-10' })
  @IsOptional()
  @IsDateString()
  drop_out_date?: string;

  @ApiProperty({ description: 'User id' })
  @IsUUID()
  user_id: string;
}

export class UpdateStudentDto extends UpdateStudentBodyDto {
  @ApiProperty({ description: 'Student id' })
  @IsUUID()
  id: string;
}

export class UpdateStudentAccountBalanceCreateDto {
  @ApiProperty({ description: 'Student id' })
  @IsUUID()
  student_id: string;

  @ApiProperty({
    description:
      'Signed balance delta. Use a positive number to top up and a negative number to reduce balance.',
    example: 500000,
  })
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Reason required for manual balance changes.',
    example: 'Phụ huynh chuyển khoản ngoài SePay',
  })
  @IsString()
  @MinLength(1)
  reason: string;
}

export class UpdateMyStudentAccountBalanceDto {
  @ApiProperty({
    description:
      'Legacy self-service wallet delta payload. The endpoint is blocked; use the SePay top-up order endpoint instead.',
    example: 500000,
  })
  @Type(() => Number)
  @IsNumber()
  amount: number;
}

export class CreateStudentSePayTopUpOrderDto {
  @ApiProperty({
    description:
      'Số tiền nạp (VND, số nguyên dương). Tạo đơn SePay kèm mã QR; không tự cộng số dư ví.',
    example: 500000,
    minimum: 1000,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(999_999_999_999)
  amount: number;
}

/** Phản hồi POST student-wallet-sepay-topup-order */
export class StudentSePayTopUpOrderResponseDto {
  @ApiProperty({ description: 'Persisted top-up order id' })
  id!: string;

  @ApiProperty({
    description:
      'Trạng thái đơn nạp SePay trong hệ thống (pending/completed/expired/cancelled/failed).',
  })
  status!: string;

  @ApiProperty({ description: 'Số tiền đơn' })
  amount!: number;

  @ApiProperty({ description: 'Số tiền yêu cầu nạp' })
  amountRequested!: number;

  @ApiPropertyOptional({ nullable: true })
  amountReceived?: number | null;

  @ApiProperty({
    description:
      'Nội dung chuyển khoản đề xuất (hiển thị / sao chép cho phụ huynh).',
  })
  transferNote!: string;

  @ApiPropertyOptional({ nullable: true })
  parentEmail?: string | null;

  @ApiProperty({ description: 'Mã đơn dùng để reconcile webhook SePay' })
  orderCode!: string;

  @ApiPropertyOptional({
    description: 'Ảnh QR dạng data URL (nếu SePay trả về)',
    nullable: true,
  })
  qrCode?: string | null;

  @ApiPropertyOptional({
    description: 'URL ảnh QR (nếu SePay trả về)',
    nullable: true,
  })
  qrCodeUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  orderId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  vaNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
  vaHolderName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  bankName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  accountNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
  accountHolderName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  expiredAt?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

/** Phản hồi GET student-wallet-sepay-static-qr */
export class StudentSePayStaticQrResponseDto {
  @ApiProperty({ description: 'Student id encoded in the transfer note.' })
  studentId!: string;

  @ApiProperty({
    description: 'Active class ids encoded after the student id.',
    type: [String],
  })
  classIds!: string[];

  @ApiProperty({
    description: 'Nội dung chuyển khoản cố định để webhook map về học sinh.',
    example:
      'NAPVI 0b45b3cc-6d67-4d7b-9c78-7f346c9a6fd7 4d560c5e-c3df-4470-b59a-2fd273ef95ef',
  })
  transferNote!: string;

  @ApiProperty({
    description: 'URL ảnh VietQR tĩnh không chứa số tiền.',
  })
  qrCodeUrl!: string;

  @ApiPropertyOptional({ nullable: true })
  bankName?: string | null;

  @ApiProperty({ description: 'Số tài khoản nhận tiền.' })
  accountNumber!: string;

  @ApiPropertyOptional({ nullable: true })
  accountHolderName?: string | null;
}

export class CreateStudentWalletDirectTopUpRequestDto {
  @ApiProperty({
    example: 500000,
    minimum: 1,
    description: 'Số tiền VND muốn nạp thẳng, phải là số nguyên dương.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({
    example: 'Phụ huynh đã chuyển nhầm không dùng QR.',
    minLength: 3,
    description: 'Lý do cần nạp thẳng để admin đối soát trước khi duyệt.',
  })
  @IsString()
  @MinLength(3)
  reason!: string;
}

export class StudentWalletDirectTopUpRequestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  studentName!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ enum: StudentWalletDirectTopUpRequestStatus })
  status!: StudentWalletDirectTopUpRequestStatus;

  @ApiProperty()
  requestedByUserEmail!: string | null;

  @ApiProperty({ enum: UserRole, nullable: true })
  requestedByRoleType!: UserRole | null;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional({ nullable: true })
  approvedAt?: string | null;
}

export class StudentWalletDirectTopUpRequestListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: [...Object.values(StudentWalletDirectTopUpRequestStatus), 'all'],
    default: StudentWalletDirectTopUpRequestStatus.pending,
    description:
      'Filter approval queue by status. Pending excludes expired pending requests; expired includes rows past expiry.',
  })
  @IsOptional()
  @IsIn([...Object.values(StudentWalletDirectTopUpRequestStatus), 'all'])
  status?: StudentWalletDirectTopUpRequestStatus | 'all';
}

export class StudentWalletDirectTopUpRequestListResponseDto {
  @ApiProperty({ type: [StudentWalletDirectTopUpRequestResponseDto] })
  data!: StudentWalletDirectTopUpRequestResponseDto[];

  @ApiProperty({
    example: { total: 1, page: 1, limit: 20 },
  })
  meta!: {
    total: number;
    page: number;
    limit: number;
  };
}

export class StudentWalletDirectTopUpApprovalTokenDto {
  @ApiProperty({ description: 'Token duyệt nạp thẳng lấy từ link email.' })
  @IsString()
  @MinLength(20)
  token!: string;
}

export class StudentWalletDirectTopUpApprovalResultDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ enum: StudentWalletDirectTopUpRequestStatus })
  status!: StudentWalletDirectTopUpRequestStatus;

  @ApiPropertyOptional({ nullable: true })
  balanceAfter?: number | null;
}

export class StudentWalletHistoryQueryDto {
  @ApiPropertyOptional({
    example: 50,
    minimum: 1,
    maximum: 200,
    default: 50,
    description: 'Maximum number of wallet transactions to return.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({
    enum: [WalletTransactionType.topup],
    description: 'Optional wallet transaction type filter.',
  })
  @IsOptional()
  @IsEnum(WalletTransactionType)
  type?: WalletTransactionType;
}

export class UpdateStudentClassesDto {
  @ApiProperty({
    description:
      'Class ids assigned to the student. Replaces current memberships.',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  class_ids: string[];
}

export class StudentExamScheduleItemDto {
  @ApiProperty({
    description: 'Exam schedule id',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Exam date in YYYY-MM-DD format',
    example: '2026-05-03',
  })
  @IsDateString()
  examDate: string;

  @ApiPropertyOptional({
    description: 'Optional note for this exam schedule',
    example: 'Thi cuối kỳ môn Toán',
  })
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-04-19T08:30:00.000Z',
  })
  @IsDateString()
  createdAt: string;

  @ApiProperty({
    description: 'Update timestamp',
    example: '2026-04-19T08:30:00.000Z',
  })
  @IsDateString()
  updatedAt: string;
}

export class StudentExamScheduleUpsertItemDto {
  @ApiPropertyOptional({
    description: 'Exam schedule id. Optional for new rows.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({
    description: 'Exam date in YYYY-MM-DD format',
    example: '2026-05-03',
  })
  @IsDateString()
  examDate: string;

  @ApiPropertyOptional({
    description: 'Optional note for this exam schedule',
    example: 'Thi cuối kỳ môn Toán',
  })
  @IsOptional()
  @IsString()
  note?: string | null;
}

export class UpdateStudentExamSchedulesDto {
  @ApiProperty({
    description: 'Replace-all payload for a student exam schedule list.',
    type: [StudentExamScheduleUpsertItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentExamScheduleUpsertItemDto)
  items: StudentExamScheduleUpsertItemDto[];
}
