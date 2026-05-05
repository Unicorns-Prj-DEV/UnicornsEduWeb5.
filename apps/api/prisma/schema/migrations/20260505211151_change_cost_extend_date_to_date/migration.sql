-- Convert cost_extend.date from text to date.
-- Empty strings become NULL to avoid cast errors.
ALTER TABLE "cost_extend"
ALTER COLUMN "date" TYPE DATE
USING CASE
  WHEN "date" IS NULL OR btrim("date") = '' THEN NULL
  ELSE "date"::DATE
END;
