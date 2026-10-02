import { getUserFullNameFromParts } from 'src/common/user-name.util';
import type { StudentClassCardDto } from 'src/dtos/student.dto';

export type StudentClassCardSource = {
  class: {
    id: string;
    name: string;
    coverImagePath: string | null;
    course: { name: string };
    teachers: Array<{
      teacher: {
        user: { first_name: string | null; last_name: string | null } | null;
      };
    }>;
  };
};

export function mapStudentClassCard(
  row: StudentClassCardSource,
  coverImageUrl: string | null,
): StudentClassCardDto {
  const teacherNames = Array.from(
    new Set(
      row.class.teachers
        .map(({ teacher }) => getUserFullNameFromParts(teacher.user))
        .filter((name): name is string => Boolean(name)),
    ),
  ).sort((a, b) => a.localeCompare(b, 'vi'));

  return {
    classId: row.class.id,
    className: row.class.name,
    courseName: row.class.course.name,
    teacherNames,
    coverImageUrl,
  };
}
