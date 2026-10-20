import Image from "next/image";
import logo from "@/image/logo/logo.png";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  /** Gợi ý kích thước hiển thị cho next/image (tránh browser chọn ảnh quá nhỏ). */
  sizes?: string;
};

/** Logo trơn (chữ UNI, ngang ~1,34:1), màu gốc, nền trong suốt — dùng chung cho mọi theme và mọi instance. */
export function BrandLogo({ className, priority, sizes }: BrandLogoProps) {
  return (
    <Image
      src={logo}
      alt="UniEdu"
      width={logo.width}
      height={logo.height}
      priority={priority}
      sizes={sizes ?? "(max-width: 640px) 280px, 400px"}
      className={className}
    />
  );
}
