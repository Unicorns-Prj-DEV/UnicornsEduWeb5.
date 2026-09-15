/**
 * Axios endpoint paths for the course content tree (chapter → topic → lecture).
 *
 * Keep this module separate from `course-content-routes.ts` (Next.js page hrefs).
 * Upcoming rename tickets should only edit segment names here for HTTP calls.
 */
function enc(id: string): string {
  return encodeURIComponent(id);
}

export const contentApiPaths = {
  courseChapters: (courseId: string) => `/course/${enc(courseId)}/chapters`,

  courseChapter: (courseId: string, chapterId: string) =>
    `/course/${enc(courseId)}/chapters/${enc(chapterId)}`,

  courseChaptersReorder: (courseId: string) =>
    `/course/${enc(courseId)}/chapters/reorder`,

  courseChapterTopics: (courseId: string, chapterId: string) =>
    `/course/${enc(courseId)}/chapters/${enc(chapterId)}/topics`,

  courseChapterTopic: (
    courseId: string,
    chapterId: string,
    topicId: string,
  ) =>
    `/course/${enc(courseId)}/chapters/${enc(chapterId)}/topics/${enc(topicId)}`,

  courseChapterTopicsReorder: (courseId: string, chapterId: string) =>
    `/course/${enc(courseId)}/chapters/${enc(chapterId)}/topics/reorder`,

  topicLectures: (topicId: string) => `/topics/${enc(topicId)}/lectures`,

  topicLecture: (topicId: string, lectureId: string) =>
    `/topics/${enc(topicId)}/lectures/${enc(lectureId)}`,

  topicLecturesReorder: (topicId: string) =>
    `/topics/${enc(topicId)}/lectures/reorder`,

  topicQuestions: (topicId: string) => `/topics/${enc(topicId)}/questions`,

  topicQuestion: (topicId: string, linkId: string) =>
    `/topics/${enc(topicId)}/questions/${enc(linkId)}`,

  topicQuestionsReorder: (topicId: string) =>
    `/topics/${enc(topicId)}/questions/reorder`,

  topicQuestionsSummary: (topicId: string) =>
    `/topics/${enc(topicId)}/questions/summary`,

  topicQuestionsIsAssigned: (topicId: string) =>
    `/topics/${enc(topicId)}/questions/is-assigned`,

  lectureQuizzes: (topicId: string, lectureId: string) =>
    `/topics/${enc(topicId)}/lectures/${enc(lectureId)}/quizzes`,

  lectureQuiz: (topicId: string, lectureId: string, questionId: string) =>
    `/topics/${enc(topicId)}/lectures/${enc(lectureId)}/quizzes/${enc(questionId)}`,

  studentClassTopic: (classId: string, topicId: string) =>
    `/users/me/student-classes/${enc(classId)}/topics/${enc(topicId)}`,

  studentClassTopicView: (classId: string, topicId: string) =>
    `/users/me/student-classes/${enc(classId)}/topics/${enc(topicId)}/view`,

  studentLectureQuizzes: (
    classId: string,
    topicId: string,
    lectureId: string,
  ) =>
    `/users/me/student-classes/${enc(classId)}/topics/${enc(topicId)}/lectures/${enc(lectureId)}/quizzes`,

  studentLectureQuizAnswers: (
    classId: string,
    topicId: string,
    lectureId: string,
  ) =>
    `/users/me/student-classes/${enc(classId)}/topics/${enc(topicId)}/lectures/${enc(lectureId)}/quizzes/answers`,

  classCourseTopics: (classId: string) =>
    `/class/${enc(classId)}/content/course-topics`,
} as const;
