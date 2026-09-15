import { describe, expect, it } from "vitest";
import {
  chapterTopicsHref,
  courseDetailHref,
  newTopicHref,
  studentClassTopicsHref,
  studentTopicHref,
  topicHref,
} from "@/lib/course-content-routes";

describe("course-content-routes (Next.js hrefs)", () => {
  it("builds admin/staff course and topic pages", () => {
    expect(courseDetailHref("/admin", "c1")).toBe("/admin/courses/c1");
    expect(
      courseDetailHref("/staff", "c1", { tab: "noi-dung", chapter: "ch1" }),
    ).toBe("/staff/courses/c1?tab=noi-dung&chapter=ch1");
    expect(chapterTopicsHref("/admin", "c1", "ch1")).toBe(
      "/admin/courses/c1?tab=noi-dung&chapter=ch1",
    );
    expect(newTopicHref("/admin", "c1", "ch1")).toBe(
      "/admin/courses/c1/chapters/ch1/topics/new",
    );
    expect(topicHref("/staff", "c1", "ch1", "t1")).toBe(
      "/staff/courses/c1/chapters/ch1/topics/t1",
    );
    expect(topicHref("/admin", "c1", "ch1", "t1", "lec 1")).toBe(
      "/admin/courses/c1/chapters/ch1/topics/t1?lecture=lec%201",
    );
  });

  it("builds student class topic pages", () => {
    expect(studentClassTopicsHref("cl1")).toBe(
      "/student/classes/cl1?tab=topics",
    );
    expect(studentTopicHref("cl1", "t1")).toBe(
      "/student/classes/cl1/topics/t1",
    );
  });
});
