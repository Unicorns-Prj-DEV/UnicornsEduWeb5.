"use client";

import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";
import type { AppThemeId } from "@/dtos/theme.dto";
import logoDark from "@/image/logo/logo_dark.png";
import logoHana from "@/image/logo/logo_hana.png";
import logoLight from "@/image/logo/logo_light.png";

const sources: Record<AppThemeId, typeof logoLight> = {
  light: logoLight,
  dark: logoDark,
  pink: logoHana,
};

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  /** Gợi ý kích thước hiển thị cho next/image (tránh browser chọn ảnh quá nhỏ). */
  sizes?: string;
};

export function BrandLogo({ className, priority, sizes }: BrandLogoProps) {
  const { theme } = useTheme();
  const src = sources[theme];

  return (
    <Image
      src={src}
      alt="Unicorns Edu"
      width={src.width}
      height={src.height}
      priority={priority}
      sizes={sizes ?? "(max-width: 640px) 280px, 400px"}
      className={className}
    />
  );
}
