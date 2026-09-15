import { describe, expect, it } from "vitest";
import { contentApiPaths } from "@/lib/content-api-paths";

describe("contentApiPaths (Axios endpoints)", () => {
  it("matches the current course / topic / lecture API surface", () => {
    expect(contentApiPaths.courseChapters("c1")).toBe("/course/c1/chapters");
    expect(contentApiPaths.courseChapter("c1", "ch1")).toBe(
      "/course/c1/chapters/ch1",
    );
    expect(contentApiPaths.courseChaptersReorder("c1")).toBe(
      "/course/c1/chapters/reorder",
    );
    expect(contentApiPaths.courseChapterTopics("c1", "ch1")).toBe(
      "/course/c1/chapters/ch1/topics",
    );
    expect(contentApiPaths.courseChapterTopic("c1", "ch1", "t1")).toBe(
      "/course/c1/chapters/ch1/topics/t1",
    );
    expect(contentApiPaths.courseChapterTopicsReorder("c1", "ch1")).toBe(
      "/course/c1/chapters/ch1/topics/reorder",
    );
    expect(contentApiPaths.topicLectures("t1")).toBe("/topics/t1/lectures");
    expect(contentApiPaths.topicLecture("t1", "l1")).toBe(
      "/topics/t1/lectures/l1",
    );
    expect(contentApiPaths.topicLecturesReorder("t1")).toBe(
      "/topics/t1/lectures/reorder",
    );
    expect(contentApiPaths.topicQuestions("t1")).toBe("/topics/t1/questions");
    expect(contentApiPaths.topicQuestion("t1", "q1")).toBe(
      "/topics/t1/questions/q1",
    );
    expect(contentApiPaths.topicQuestionsReorder("t1")).toBe(
      "/topics/t1/questions/reorder",
    );
    expect(contentApiPaths.topicQuestionsSummary("t1")).toBe(
      "/topics/t1/questions/summary",
    );
    expect(contentApiPaths.topicQuestionsIsAssigned("t1")).toBe(
      "/topics/t1/questions/is-assigned",
    );
    expect(contentApiPaths.lectureQuizzes("t1", "l1")).toBe(
      "/topics/t1/lectures/l1/quizzes",
    );
    expect(contentApiPaths.lectureQuiz("t1", "l1", "q1")).toBe(
      "/topics/t1/lectures/l1/quizzes/q1",
    );
    expect(contentApiPaths.studentClassTopic("cl1", "t1")).toBe(
      "/users/me/student-classes/cl1/topics/t1",
    );
    expect(contentApiPaths.studentClassTopicView("cl1", "t1")).toBe(
      "/users/me/student-classes/cl1/topics/t1/view",
    );
    expect(contentApiPaths.studentLectureQuizzes("cl1", "t1", "l1")).toBe(
      "/users/me/student-classes/cl1/topics/t1/lectures/l1/quizzes",
    );
    expect(contentApiPaths.studentLectureQuizAnswers("cl1", "t1", "l1")).toBe(
      "/users/me/student-classes/cl1/topics/t1/lectures/l1/quizzes/answers",
    );
    expect(contentApiPaths.classCourseTopics("cl1")).toBe(
      "/class/cl1/content/course-topics",
    );
  });

  it("percent-encodes ids", () => {
    expect(contentApiPaths.courseChapter("c 1", "ch/2")).toBe(
      "/course/c%201/chapters/ch%2F2",
    );
  });
});
