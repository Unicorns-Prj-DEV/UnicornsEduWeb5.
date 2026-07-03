import { toast } from "sonner";

export function pickAvatarUrl(
  ...sources: Array<string | null | undefined>
): string | null {
  for (const source of sources) {
    const trimmed = source?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function extensionFromMime(mime: string | null | undefined): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    default:
      return "jpg";
  }
}

function extensionFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const match = pathname.match(/\.(png|jpe?g|webp)$/i);
    return match?.[1]?.replace("jpeg", "jpg") ?? null;
  } catch {
    return null;
  }
}

export function suggestAvatarFilename(
  displayName: string,
  src?: string | null,
  mimeType?: string | null,
): string {
  const slug =
    displayName
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "avatar";

  const ext =
    extensionFromMime(mimeType) ??
    (src ? extensionFromUrl(src) : null) ??
    "jpg";

  return `${slug}-avatar.${ext}`;
}

export async function downloadAvatar(
  url: string,
  filename: string,
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Không tải được ảnh đại diện.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadAvatarWithToast(
  url: string,
  filename: string,
): Promise<void> {
  try {
    await downloadAvatar(url, filename);
    toast.success("Đã tải ảnh đại diện.");
  } catch {
    toast.error("Không tải được ảnh đại diện. Vui lòng thử lại.");
  }
}
