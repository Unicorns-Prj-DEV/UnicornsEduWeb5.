WITH orphan_staff AS (
  SELECT
    s.id AS staff_id,
    regexp_replace(TRIM(s.full_name), '\s+', ' ', 'g') AS normalized_full_name,
    'legacy-staff-' || REPLACE(s.id::text, '-', '') || '@placeholder.invalid' AS email,
    'legacy_staff_' || REPLACE(s.id::text, '-', '') AS account_handle,
    CASE
      WHEN s.status::text = 'inactive' THEN 'inactive'::"UserStatus"
      ELSE 'active'::"UserStatus"
    END AS user_status
  FROM staff_info AS s
  WHERE s.user_id IS NULL
    AND NULLIF(TRIM(s.full_name), '') IS NOT NULL
),
inserted_person_profiles AS (
  INSERT INTO person_profiles (
    id,
    full_name,
    first_name,
    last_name,
    created_at,
    updated_at
  )
  SELECT
    orphan_staff.staff_id,
    orphan_staff.normalized_full_name,
    split_part(orphan_staff.normalized_full_name, ' ', 1),
    NULLIF(
      TRIM(regexp_replace(orphan_staff.normalized_full_name, '^\S+\s*', '')),
      ''
    ),
    NOW(),
    NOW()
  FROM orphan_staff
  ON CONFLICT (id) DO NOTHING
),
inserted_users AS (
  INSERT INTO users (
    id,
    person_profile_id,
    email,
    account_handle,
    role_type,
    status,
    email_verified,
    phone_verified,
    created_at,
    updated_at,
    first_name,
    last_name
  )
  SELECT
    orphan_staff.staff_id,
    orphan_staff.staff_id,
    orphan_staff.email,
    orphan_staff.account_handle,
    'staff'::"UserRole",
    orphan_staff.user_status,
    false,
    false,
    NOW(),
    NOW(),
    split_part(orphan_staff.normalized_full_name, ' ', 1),
    NULLIF(
      TRIM(regexp_replace(orphan_staff.normalized_full_name, '^\S+\s*', '')),
      ''
    )
  FROM orphan_staff
  ON CONFLICT (id) DO NOTHING
  RETURNING id
),
resolved_orphan_users AS (
  SELECT
    orphan_staff.staff_id,
    orphan_staff.staff_id AS user_id
  FROM orphan_staff
)
UPDATE staff_info AS s
SET user_id = resolved_orphan_users.user_id
FROM resolved_orphan_users
WHERE s.id = resolved_orphan_users.staff_id;

WITH normalized_staff_names AS (
  SELECT
    user_id,
    regexp_replace(TRIM(full_name), '\s+', ' ', 'g') AS normalized_full_name
  FROM staff_info
  WHERE user_id IS NOT NULL
    AND NULLIF(TRIM(full_name), '') IS NOT NULL
)
UPDATE users AS u
SET
  first_name = split_part(names.normalized_full_name, ' ', 1),
  last_name = NULLIF(
    TRIM(regexp_replace(names.normalized_full_name, '^\S+\s*', '')),
    ''
  )
FROM normalized_staff_names AS names
WHERE names.user_id = u.id;

ALTER TABLE "staff_info"
DROP COLUMN "full_name";
