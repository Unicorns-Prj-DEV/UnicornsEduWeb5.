import { ApiProperty } from '@nestjs/swagger';
import type {
  LmsProfile,
  LmsProfileConfig,
  LmsQuestionType,
  LmsScoring,
} from '../lms-profile/lms-profile';

class OptionCountDto {
  @ApiProperty({ example: 2 })
  min!: number;

  @ApiProperty({ example: 6 })
  max!: number;

  @ApiProperty({ example: 4 })
  default!: number;
}

export class AppConfigResponseDto implements LmsProfileConfig {
  @ApiProperty({ enum: ['it', 'jp', 'eng'], example: 'it' })
  profile!: LmsProfile;

  @ApiProperty({
    enum: ['single_choice', 'essay', 'true_false_group'],
    isArray: true,
    example: ['single_choice', 'true_false_group'],
  })
  questionTypes!: LmsQuestionType[];

  @ApiProperty({ type: OptionCountDto })
  optionCount!: OptionCountDto;

  @ApiProperty({
    enum: ['equal_100', 'absolute_it'],
    description:
      '`equal_100`: chia đều 100 cho N câu. `absolute_it`: điểm tuyệt đối, lưu đơn vị 1/100 điểm (trắc nghiệm 25, Đúng/Sai tối đa 100).',
  })
  scoring!: LmsScoring;

  @ApiProperty({ description: 'Tiết thực hành có nhóm tự chọn hay không' })
  electiveGroups!: boolean;
}
