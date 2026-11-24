-- Giới hạn số ký tự câu trả lời tự luận (hồ sơ JP). null = không giới hạn.
ALTER TABLE "questions" ADD COLUMN "essay_max_chars" INTEGER;
ALTER TABLE "attempt_answers" ADD COLUMN "essay_max_chars" INTEGER;
