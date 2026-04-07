DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'regulations'
  ) THEN
    ALTER TABLE "regulations" ALTER COLUMN "updated_at" DROP DEFAULT;
  END IF;
END $$;
