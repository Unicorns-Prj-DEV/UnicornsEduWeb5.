import { describe, expect, it } from "vitest";
import {
  STAFF_QR_SCANNABLE_PIXEL,
  buildStaffQrDisplaySrc,
  extractGoogleDriveFileId,
  isStaffQrImageUrl,
  resolveStaffQrImageSrc,
  staffQrServerUrl,
  toGoogleDriveDirectImageUrl,
} from "./staff-qr-image";

const DRIVE_ID = "11-i19EMVIDCXXSsuFpiddbbVNpCraxpw";
const DIRECT = `https://drive.google.com/uc?export=view&id=${DRIVE_ID}`;

describe("extractGoogleDriveFileId", () => {
  it("reads /file/d/<ID>/view?usp=drivesdk", () => {
    expect(
      extractGoogleDriveFileId(
        `https://drive.google.com/file/d/${DRIVE_ID}/view?usp=drivesdk`,
      ),
    ).toBe(DRIVE_ID);
  });

  it("reads /file/d/<ID>/edit and sharing query variants", () => {
    expect(
      extractGoogleDriveFileId(
        `https://drive.google.com/file/d/${DRIVE_ID}/edit?usp=sharing`,
      ),
    ).toBe(DRIVE_ID);
  });

  it("reads open?id=<ID>", () => {
    expect(
      extractGoogleDriveFileId(
        `https://drive.google.com/open?id=${DRIVE_ID}`,
      ),
    ).toBe(DRIVE_ID);
  });

  it("reads uc?id=<ID> and uc?export=view&id=<ID>", () => {
    expect(
      extractGoogleDriveFileId(`https://drive.google.com/uc?id=${DRIVE_ID}`),
    ).toBe(DRIVE_ID);
    expect(extractGoogleDriveFileId(DIRECT)).toBe(DRIVE_ID);
  });

  it("returns null for non-Drive URLs", () => {
    expect(extractGoogleDriveFileId("https://imgur.com/abc.png")).toBeNull();
    expect(extractGoogleDriveFileId("not a url")).toBeNull();
  });
});

describe("resolveStaffQrImageSrc", () => {
  it("maps Drive view HTML pages to the direct image endpoint", () => {
    expect(
      resolveStaffQrImageSrc(
        `https://drive.google.com/file/d/${DRIVE_ID}/view?usp=drivesdk`,
      ),
    ).toBe(DIRECT);
  });

  it("maps Drive edit / open / uc variants to the same direct URL", () => {
    expect(
      resolveStaffQrImageSrc(
        `https://drive.google.com/file/d/${DRIVE_ID}/edit`,
      ),
    ).toBe(DIRECT);
    expect(
      resolveStaffQrImageSrc(`https://drive.google.com/open?id=${DRIVE_ID}`),
    ).toBe(DIRECT);
    expect(
      resolveStaffQrImageSrc(`https://drive.google.com/uc?id=${DRIVE_ID}`),
    ).toBe(DIRECT);
  });

  it("keeps ordinary image URLs as-is", () => {
    expect(
      resolveStaffQrImageSrc("https://cdn.example.com/qr.png?v=1"),
    ).toBe("https://cdn.example.com/qr.png?v=1");
    expect(resolveStaffQrImageSrc("https://i.imgur.com/abc.jpg")).toBe(
      "https://i.imgur.com/abc.jpg",
    );
  });

  it("returns null for non-image payment links", () => {
    expect(
      resolveStaffQrImageSrc("https://example.net/bank-transfer"),
    ).toBeNull();
    expect(isStaffQrImageUrl("https://example.net/bank-transfer")).toBe(false);
    expect(
      isStaffQrImageUrl(
        `https://drive.google.com/file/d/${DRIVE_ID}/view?usp=drivesdk`,
      ),
    ).toBe(true);
  });
});

describe("buildStaffQrDisplaySrc", () => {
  it("uses the Drive direct image URL regardless of requested pixel size", () => {
    const result = buildStaffQrDisplaySrc(
      `https://drive.google.com/file/d/${DRIVE_ID}/view?usp=drivesdk`,
      64,
    );
    expect(result).toEqual({ src: DIRECT, isUploadedImage: true });
  });

  it("requests a large qrserver image for non-image links instead of stretching a thumbnail", () => {
    const link = "https://example.net/pay-me";
    const result = buildStaffQrDisplaySrc(link, STAFF_QR_SCANNABLE_PIXEL);
    expect(result).toEqual({
      src: staffQrServerUrl(link, STAFF_QR_SCANNABLE_PIXEL),
      isUploadedImage: false,
    });
    expect(result?.src).toContain("512x512");
    expect(result?.src).not.toContain("64x64");
  });
});

describe("toGoogleDriveDirectImageUrl", () => {
  it("builds the public-file image endpoint", () => {
    expect(toGoogleDriveDirectImageUrl(DRIVE_ID)).toBe(DIRECT);
  });
});
