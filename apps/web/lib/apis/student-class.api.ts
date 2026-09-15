import { api } from "@/lib/client";
import { contentApiPaths } from "@/lib/content-api-paths";
import type {
  StudentClassItem,
  StudentSessionItem,
  StudentSurveyItem,
} from "@/dtos/student-class.dto";
import type {
  LectureQuizQuestion,
  LectureQuizAnswer,
  SubmitQuizAnswerPayload,
} from "@/dtos/topic.dto";
import type { TheoryTopicViewDto } from "@/dtos/class-theory-progress.dto";

export async function getMyClasses(): Promise<StudentClassItem[]> {
  const { data } = await api.get("/users/me/student-classes");
  return data;
}

export async function getMyClassDetail(
  classId: string,
): Promise<StudentClassItem> {
  const { data } = await api.get(`/users/me/student-classes/${classId}/detail`);
  return data;
}

export async function getMyClassSessions(
  classId: string,
): Promise<StudentSessionItem[]> {
  const { data } = await api.get(
    `/users/me/student-classes/${classId}/sessions`,
  );
  return data;
}

export async function getMyClassSurveys(
  classId: string,
): Promise<StudentSurveyItem[]> {
  const { data } = await api.get(
    `/users/me/student-classes/${classId}/surveys`,
  );
  return data;
}

export async function getMyClassTopic(
  classId: string,
  topicId: string,
): Promise<{
  id: string;
  title: string;
  kind: string;
  createdAt: Date;
  updatedAt: Date;
}> {
  const { data } = await api.get(
    contentApiPaths.studentClassTopic(classId, topicId),
  );
  return data;
}

export async function recordMyTheoryTopicView({
  classId,
  topicId,
}: {
  classId: string;
  topicId: string;
}): Promise<TheoryTopicViewDto> {
  const { data } = await api.post(
    contentApiPaths.studentClassTopicView(classId, topicId),
  );
  return data;
}

// ─── Student Lecture Quiz ───

export async function getMyLectureQuizzes(
  classId: string,
  topicId: string,
  lectureId: string,
): Promise<LectureQuizQuestion[]> {
  const { data } = await api.get(
    contentApiPaths.studentLectureQuizzes(classId, topicId, lectureId),
  );
  return Array.isArray(data) ? data : [];
}

export async function submitMyQuizAnswers(
  classId: string,
  topicId: string,
  lectureId: string,
  answers: SubmitQuizAnswerPayload[],
): Promise<LectureQuizAnswer[]> {
  const { data } = await api.post(
    contentApiPaths.studentLectureQuizAnswers(classId, topicId, lectureId),
    answers,
  );
  return data;
}

export async function getMyQuizAnswers(
  classId: string,
  topicId: string,
  lectureId: string,
): Promise<LectureQuizAnswer[]> {
  const { data } = await api.get(
    contentApiPaths.studentLectureQuizAnswers(classId, topicId, lectureId),
  );
  return Array.isArray(data) ? data : [];
}
