import { validateSync } from 'class-validator';
import { IsClassId, IsStaffId, IsStudentId } from './entity-id.validators';

const STUDENT_ID = 'UNIST-0b45b3cc-6d67-4d7b-9c78-7f346c9a6fd7';
const CLASS_ID = 'UNICL-0b45b3cc-6d67-4d7b-9c78-7f346c9a6fd7';
const STAFF_ID = 'UNISTAFF-0b45b3cc-6d67-4d7b-9c78-7f346c9a6fd7';
const BARE_UUID = '0b45b3cc-6d67-4d7b-9c78-7f346c9a6fd7';

class EntityArrayDto {
  @IsStudentId({ each: true })
  student_ids!: string[];

  @IsClassId({ each: true })
  class_ids!: string[];

  @IsStaffId({ each: true })
  teacher_ids!: string[];
}

describe('entity id validators', () => {
  it('accepts prefixed entity id arrays when each:true is used', () => {
    const dto = new EntityArrayDto();
    dto.student_ids = [STUDENT_ID];
    dto.class_ids = [CLASS_ID];
    dto.teacher_ids = [STAFF_ID];

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects bare UUIDs in entity id arrays', () => {
    const dto = new EntityArrayDto();
    dto.student_ids = [BARE_UUID];
    dto.class_ids = [BARE_UUID];
    dto.teacher_ids = [BARE_UUID];

    const errors = validateSync(dto);

    expect(errors.map((error) => error.property).sort()).toEqual([
      'class_ids',
      'student_ids',
      'teacher_ids',
    ]);
  });
});
