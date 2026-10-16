import Image from "next/image";
import logo from "@/image/logo/logo.png";
import logoFull from "@/image/logo/logo_full.png";

const sources = {
  /** Chỉ chữ UNI (ngang ~1,34:1) — sidebar thu gọn, chỗ hẹp. */
  mark: logo,
  /** UNI + dòng «UNI EDUCATION» (gần vuông ~1,15:1) — thay cho wordmark chữ. */
  full: logoFull,
} as const;

export type BrandLogoKind = keyof typeof sources;

type BrandLogoProps = {
  kind?: BrandLogoKind;
  className?: string;
  priority?: boolean;
  /** Gợi ý kích thước hiển thị cho next/image (tránh browser chọn ảnh quá nhỏ). */
  sizes?: string;
};

/** Logo màu gốc, nền trong suốt — dùng chung cho mọi theme. */
export function BrandLogo({ kind = "mark", className, priority, sizes }: BrandLogoProps) {
  const src = sources[kind];

  return (
    <Image
      src={src}
      alt="UniEdu"
      width={src.width}
      height={src.height}
      priority={priority}
      sizes={sizes ?? "(max-width: 640px) 280px, 400px"}
      className={className}
    />
  );
}
