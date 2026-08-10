import { readFileSync } from 'fs';
import { join } from 'path';
import { bakeDiagonalWatermark } from './image-watermark';
import { createPublicStorageUrl } from './supabase-storage';

describe('image watermark + public URL', () => {
  it('bakes a jpeg twin larger than empty input metadata', async () => {
    const logo = readFileSync(
      join(__dirname, 'assets', 'watermark-logo.jpg'),
    );
    // Use the brand mark itself as a stand-in source photo.
    const result = await bakeDiagonalWatermark(logo);
    expect(result.contentType).toBe('image/jpeg');
    expect(result.buffer.length).toBeGreaterThan(1000);
  });

  it('builds public storage URLs', () => {
    const previous = process.env.SUPABASE_URL;
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    expect(
      createPublicStorageUrl({
        bucket: 'avatars-public',
        path: 'users/u1/avatar.jpg',
      }),
    ).toBe(
      'https://example.supabase.co/storage/v1/object/public/avatars-public/users/u1/avatar.jpg',
    );
    expect(
      createPublicStorageUrl({ bucket: 'avatars-public', path: null }),
    ).toBeNull();
    process.env.SUPABASE_URL = previous;
  });
});
