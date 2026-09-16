const IMAGE_EXTENSION_RE = /\.(png|jpg|jpeg|gif|webp)(\?|$)/i;
const DRIVE_FILE_PATH_RE = /\/file\/d\/([^/]+)/i;

/** Pixel size requested from qrserver when showing a scannable overlay. */
export const STAFF_QR_SCANNABLE_PIXEL = 512;

function parseHttpUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isGoogleDriveHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "drive.google.com" || host === "docs.google.com";
}

/**
 * Pull the file id from Drive share URLs:
 * `/file/d/<ID>/view`, `/edit`, `open?id=<ID>`, `uc?id=<ID>` (+ query variants).
 */
export function extractGoogleDriveFileId(rawUrl: string): string | null {
  const parsed = parseHttpUrl(rawUrl);
  if (!parsed || !isGoogleDriveHost(parsed.hostname)) {
    return null;
  }

  const fromPath = parsed.pathname.match(DRIVE_FILE_PATH_RE)?.[1];
  if (fromPath) {
    const decoded = decodeURIComponent(fromPath).trim();
    return decoded || null;
  }

  const fromQuery = parsed.searchParams.get("id")?.trim();
  return fromQuery || null;
}

/** Direct image bytes for a publicly shared Drive file. */
export function toGoogleDriveDirectImageUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
}

export function resolveStaffQrImageSrc(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    return toGoogleDriveDirectImageUrl(driveId);
  }

  const lower = trimmed.toLowerCase();
  if (IMAGE_EXTENSION_RE.test(lower) || lower.includes("imgur")) {
    return trimmed;
  }

  return null;
}

export function isStaffQrImageUrl(rawUrl: string): boolean {
  return resolveStaffQrImageSrc(rawUrl) !== null;
}

export function staffQrServerUrl(data: string, pixel: number): string {
  const size = Math.max(1, Math.trunc(pixel));
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export function buildStaffQrDisplaySrc(
  rawUrl: string,
  pixel: number,
): { src: string; isUploadedImage: boolean } | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const imageSrc = resolveStaffQrImageSrc(trimmed);
  if (imageSrc) {
    return { src: imageSrc, isUploadedImage: true };
  }

  return { src: staffQrServerUrl(trimmed, pixel), isUploadedImage: false };
}
