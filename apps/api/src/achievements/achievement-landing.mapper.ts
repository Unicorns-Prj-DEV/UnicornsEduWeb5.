import { createPublicStorageUrl } from 'src/storage/supabase-storage';
import { ACHIEVEMENT_PUBLIC_BUCKET } from 'src/storage/media-buckets';
import type { LandingAchievementDto } from 'src/dtos/landing-profile.dto';

type AchievementLandingRow = {
  id: string;
  title: string;
  imageWatermarkedPath: string | null;
  sortOrder: number;
};

/** Map achievement rows to landing DTOs using watermarked public URLs only. */
export function mapLandingAchievements(
  rows: AchievementLandingRow[],
): LandingAchievementDto[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    imagePath: row.imageWatermarkedPath,
    imageUrl: createPublicStorageUrl({
      bucket: ACHIEVEMENT_PUBLIC_BUCKET,
      path: row.imageWatermarkedPath,
    }),
    sortOrder: row.sortOrder,
  }));
}
