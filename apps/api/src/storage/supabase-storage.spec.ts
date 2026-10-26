import { BadRequestException } from '@nestjs/common';
import {
  buildImageUploadFileFilter,
  normalizeHttpHttpsUrl,
  toInternalStorageRequestUrl,
} from './supabase-storage';

describe('supabase-storage helpers', () => {
  it('rewrites only requests to the public storage origin', () => {
    const publicUrl = 'https://it.uniedu.vn/';
    const internalUrl = 'http://nginx';

    expect(
      toInternalStorageRequestUrl(
        'https://it.uniedu.vn/storage/v1/object/sign/avatars/a.png',
        publicUrl,
        internalUrl,
      ),
    ).toBe('http://nginx/storage/v1/object/sign/avatars/a.png');
    expect(
      toInternalStorageRequestUrl(
        'https://it.uniedu.vn.evil.com/storage/v1/x',
        publicUrl,
        internalUrl,
      ),
    ).toBe('https://it.uniedu.vn.evil.com/storage/v1/x');
    expect(
      toInternalStorageRequestUrl(
        'https://example.com/a',
        publicUrl,
        internalUrl,
      ),
    ).toBe('https://example.com/a');
  });

  it('normalizes http/https URLs and rejects unsupported protocols', () => {
    expect(normalizeHttpHttpsUrl(' https://example.com/qr ', 'QR link')).toBe(
      'https://example.com/qr',
    );
    expect(normalizeHttpHttpsUrl('   ', 'QR link')).toBeNull();
    expect(normalizeHttpHttpsUrl(undefined, 'QR link')).toBeUndefined();

    expect(() =>
      normalizeHttpHttpsUrl('javascript:alert(1)', 'QR link'),
    ).toThrow(BadRequestException);
  });

  it('accepts only supported image mime types in multer fileFilter', () => {
    const fileFilter = buildImageUploadFileFilter({
      labelsByFieldName: {
        avatar: 'Ảnh đại diện',
      },
    });

    const okCallback = jest.fn();
    fileFilter(
      {},
      {
        fieldname: 'avatar',
        mimetype: 'image/png',
      },
      okCallback,
    );
    expect(okCallback).toHaveBeenCalledWith(null, true);

    const badCallback = jest.fn();
    fileFilter(
      {},
      {
        fieldname: 'avatar',
        mimetype: 'text/plain',
      },
      badCallback,
    );
    expect(badCallback).toHaveBeenCalled();
    const [error, accepted] = badCallback.mock.calls[0] as [Error, boolean];
    expect(accepted).toBe(false);
    expect(error).toBeInstanceOf(BadRequestException);
  });
});
