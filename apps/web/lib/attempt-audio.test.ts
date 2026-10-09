import { describe, expect, it } from "vitest";
import { audioPlaysLeft, openAudio } from "./attempt-audio";

const limited = {
  id: "au-1",
  url: null,
  maxPlays: 2,
  allowSeek: false,
  playsUsed: 1,
};

describe("audioPlaysLeft", () => {
  it("không giới hạn → null", () => {
    expect(audioPlaysLeft({ ...limited, maxPlays: null })).toBeNull();
  });

  it("còn lượt = tối đa − đã nghe", () => {
    expect(audioPlaysLeft(limited)).toBe(1);
  });

  it("không âm khi đã nghe vượt (đổi giới hạn sau khi học sinh nghe)", () => {
    expect(audioPlaysLeft({ ...limited, maxPlays: 1, playsUsed: 2 })).toBe(0);
  });
});

describe("openAudio", () => {
  it("URL thường (ôn nhẹ, xem trước) thành audio không giới hạn, cho tua", () => {
    expect(openAudio("https://x/a.mp3")).toEqual({
      id: "https://x/a.mp3",
      url: "https://x/a.mp3",
      maxPlays: null,
      allowSeek: true,
      playsUsed: 0,
    });
  });

  it("không có URL → không có audio", () => {
    expect(openAudio(null)).toBeNull();
    expect(openAudio(undefined)).toBeNull();
  });
});
