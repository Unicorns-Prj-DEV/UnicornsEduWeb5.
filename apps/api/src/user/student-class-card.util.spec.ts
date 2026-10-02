import { mapStudentClassCard } from './student-class-card.util';

const teacher = (first_name: string | null, last_name: string | null) => ({
  teacher: { user: { first_name, last_name } },
});

describe('mapStudentClassCard', () => {
  it('maps class, course and teacher full names (last name first)', () => {
    expect(
      mapStudentClassCard({
        class: {
          id: 'c1',
          name: 'Lớp A',
          course: { name: 'Khoá X' },
          teachers: [teacher('An', 'Nguyễn Văn')],
        },
      }),
    ).toEqual({
      classId: 'c1',
      className: 'Lớp A',
      courseName: 'Khoá X',
      teacherNames: ['Nguyễn Văn An'],
    });
  });

  it('drops empty names, dedupes and sorts teacher names', () => {
    const card = mapStudentClassCard({
      class: {
        id: 'c1',
        name: 'Lớp A',
        course: { name: 'Khoá X' },
        teachers: [
          teacher('Bình', 'Trần'),
          teacher(null, null),
          { teacher: { user: null } },
          teacher('An', 'Lê'),
          teacher('Bình', 'Trần'),
        ],
      },
    });
    expect(card.teacherNames).toEqual(['Lê An', 'Trần Bình']);
  });
});
