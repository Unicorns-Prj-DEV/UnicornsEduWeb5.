import { BadRequestException } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const WATERMARK_TILE_MAX_EDGE = 180;
const WATERMARK_ALPHA = 0.35;
/** Near-black brick background of the brand mark → transparent for tiling. */
const BG_LUMA_CUTOFF = 42;

let cachedLogoTile: Buffer | null = null;

function resolveWatermarkLogoPath(): string {
  const candidates = [
    join(__dirname, 'assets', 'watermark-logo.jpg'),
    join(__dirname, 'assets', 'watermark-logo.png'),
    join(process.cwd(), 'src', 'storage', 'assets', 'watermark-logo.jpg'),
    join(process.cwd(), 'src', 'storage', 'assets', 'watermark-logo.png'),
    join(process.cwd(), 'dist', 'storage', 'assets', 'watermark-logo.jpg'),
    join(process.cwd(), 'dist', 'storage', 'assets', 'watermark-logo.png'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new BadRequestException(
    'Thiếu asset watermark (storage/assets/watermark-logo.jpg).',
  );
}

async function getWatermarkTile(): Promise<Buffer> {
  if (cachedLogoTile) {
    return cachedLogoTile;
  }

  const logo = readFileSync(resolveWatermarkLogoPath());
  const resized = await sharp(logo)
    .resize({
      width: WATERMARK_TILE_MAX_EDGE,
      height: WATERMARK_TILE_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(resized.data);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luma < BG_LUMA_CUTOFF) {
      pixels[i + 3] = 0;
    } else {
      pixels[i + 3] = Math.round(pixels[i + 3] * WATERMARK_ALPHA);
    }
  }

  const faded = await sharp(pixels, {
    raw: {
      width: resized.info.width,
      height: resized.info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();

  cachedLogoTile = await sharp(faded)
    .rotate(-30, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return cachedLogoTile;
}

/**
 * Bake a diagonal tiled brand watermark into the image.
 * Returns JPEG buffer for stable public twin paths (always `.jpg`).
 */
export async function bakeDiagonalWatermark(
  input: Buffer,
): Promise<{ buffer: Buffer; contentType: 'image/jpeg' }> {
  try {
    const tile = await getWatermarkTile();
    const buffer = await sharp(input)
      .rotate()
      .composite([
        {
          input: tile,
          tile: true,
          blend: 'over',
        },
      ])
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    return { buffer, contentType: 'image/jpeg' };
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException(
      'Không thể tạo ảnh watermark. Vui lòng thử lại với ảnh khác.',
    );
  }
}

export function buildAvatarWatermarkedPath(userId: string): string {
  return `users/${userId}/avatar.jpg`;
}

export function buildAchievementWatermarkedPath(
  ownerKind: 'staff' | 'student',
  ownerId: string,
  achievementId: string,
): string {
  return `${ownerKind}/${ownerId}/${achievementId}.jpg`;
}

export function buildStudentGalleryWatermarkedPath(
  studentId: string,
  itemId: string,
): string {
  return `student/${studentId}/${itemId}.jpg`;
}
