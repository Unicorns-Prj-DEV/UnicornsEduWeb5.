import { validateSync } from 'class-validator';
import {
  IsClassId,
  IsStaffId,
  IsStudentId,
  IsLessonTaskId,
  IsLessonResourceId,
  IsLessonOutputId,
  IsStaffLessonTaskId,
} from './entity-id.validators';

const STUDENT_ID = 'UNIST-0b45b3cc6d';
const CLASS_ID = 'UNICL-0b45b3cc6d';
const STAFF_ID = 'UNISTAFF-0b45b3cc6d';
const LESSON_TASK_ID = 'UNILTK-0b45b3cc6d';
const LESSON_RESOURCE_ID = 'UNILRS-0b45b3cc6d';
const LESSON_OUTPUT_ID = 'UNILOT-0b45b3cc6d';
const STAFF_LESSON_TASK_ID = 'UNISLT-0b45b3cc6d';
const BARE_UUID = '0b45b3cc-6d67-4d7b-9c78-7f346c9a6fd7';
const OLD_STUDENT_ID = `UNIST-${BARE_UUID}`;
const OLD_CLASS_ID = `UNICL-${BARE_UUID}`;
const OLD_STAFF_ID = `UNISTAFF-${BARE_UUID}`;
const OLD_LESSON_TASK_ID = `UNILTK-${BARE_UUID}`;
const OLD_LESSON_RESOURCE_ID = `UNILRS-${BARE_UUID}`;
const OLD_LESSON_OUTPUT_ID = `UNILOT-${BARE_UUID}`;
const OLD_STAFF_LESSON_TASK_ID = `UNISLT-${BARE_UUID}`;

class EntityArrayDto {
  @IsStudentId({ each: true })
  student_ids!: string[];

  @IsClassId({ each: true })
  class_ids!: string[];

  @IsStaffId({ each: true })
  teacher_ids!: string[];

  @IsLessonTaskId({ each: true })
  lesson_task_ids!: string[];

  @IsLessonResourceId({ each: true })
  lesson_resource_ids!: string[];

  @IsLessonOutputId({ each: true })
  lesson_output_ids!: string[];

  @IsStaffLessonTaskId({ each: true })
  staff_lesson_task_ids!: string[];
}

describe('entity id validators', () => {
  it('accepts prefixed entity id arrays when each:true is used', () => {
    const dto = new EntityArrayDto();
    dto.student_ids = [STUDENT_ID];
    dto.class_ids = [CLASS_ID];
    dto.teacher_ids = [STAFF_ID];
    dto.lesson_task_ids = [LESSON_TASK_ID];
    dto.lesson_resource_ids = [LESSON_RESOURCE_ID];
    dto.lesson_output_ids = [LESSON_OUTPUT_ID];
    dto.staff_lesson_task_ids = [STAFF_LESSON_TASK_ID];

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects bare UUIDs in entity id arrays', () => {
    const dto = new EntityArrayDto();
    dto.student_ids = [BARE_UUID];
    dto.class_ids = [BARE_UUID];
    dto.teacher_ids = [BARE_UUID];
    dto.lesson_task_ids = [BARE_UUID];
    dto.lesson_resource_ids = [BARE_UUID];
    dto.lesson_output_ids = [BARE_UUID];
    dto.staff_lesson_task_ids = [BARE_UUID];

    const errors = validateSync(dto);

    expect(errors.map((error) => error.property).sort()).toEqual([
      'class_ids',
      'lesson_output_ids',
      'lesson_resource_ids',
      'lesson_task_ids',
      'staff_lesson_task_ids',
      'student_ids',
      'teacher_ids',
    ]);
  });

  it('rejects old prefixed UUIDs in entity id arrays', () => {
    const dto = new EntityArrayDto();
    dto.student_ids = [OLD_STUDENT_ID];
    dto.class_ids = [OLD_CLASS_ID];
    dto.teacher_ids = [OLD_STAFF_ID];
    dto.lesson_task_ids = [OLD_LESSON_TASK_ID];
    dto.lesson_resource_ids = [OLD_LESSON_RESOURCE_ID];
    dto.lesson_output_ids = [OLD_LESSON_OUTPUT_ID];
    dto.staff_lesson_task_ids = [OLD_STAFF_LESSON_TASK_ID];

    const errors = validateSync(dto);

    expect(errors.map((error) => error.property).sort()).toEqual([
      'class_ids',
      'lesson_output_ids',
      'lesson_resource_ids',
      'lesson_task_ids',
      'staff_lesson_task_ids',
      'student_ids',
      'teacher_ids',
    ]);
  });
});
