export type CopyQrResult = "image" | "link";

export async function copyQrImageOrLink(qrCodeUrl: string): Promise<CopyQrResult> {
  const safeQrCodeUrl = qrCodeUrl.trim();
  if (!safeQrCodeUrl) {
    throw new Error("QR URL is empty.");
  }

  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.write === "function" &&
    typeof ClipboardItem !== "undefined"
  ) {
    try {
      const response = await fetch(safeQrCodeUrl);
      if (!response.ok) {
        throw new Error("Unable to fetch QR image.");
      }

      const imageBlob = await response.blob();
      const mimeType = imageBlob.type || "image/png";
      const clipboardBlob =
        imageBlob.type === mimeType
          ? imageBlob
          : new Blob([imageBlob], { type: mimeType });

      await navigator.clipboard.write([
        new ClipboardItem({ [mimeType]: clipboardBlob }),
      ]);
      return "image";
    } catch {
      // Fall through to link copy when image clipboard is unavailable or blocked.
    }
  }

  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    typeof navigator.clipboard.writeText !== "function"
  ) {
    throw new Error("Clipboard API is unavailable.");
  }

  await navigator.clipboard.writeText(safeQrCodeUrl);
  return "link";
}
