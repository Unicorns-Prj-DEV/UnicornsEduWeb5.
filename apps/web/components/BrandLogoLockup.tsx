import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

export type BrandLogoVariant = "navbar" | "auth";

type BrandLogoLockupProps = {
  /** `false` khi sidebar thu gọn — logo cỡ nhỏ hơn, căn giữa rail. */
  showWordmark?: boolean;
  variant?: BrandLogoVariant;
  dense?: boolean;
  className?: string;
  logoClassName?: string;
  priority?: boolean;
};

/** Không khung viền; hover làm logo đậm/nét hơn (opacity + contrast nhẹ). */
const markHover =
  "transition-[opacity,filter] duration-200 ease-out opacity-[0.88] contrast-100 group-hover/brand:opacity-100 group-hover/brand:contrast-[1.12]";

/**
 * Logo trơn (chữ UNI) dùng mọi nơi, không render thêm chữ.
 * Navbar/sidebar: cao 48px (52px từ `sm`), vừa header `h-14`/`h-16`.
 */
const fullLogo = {
  navbar: "h-12 w-auto max-h-12 shrink-0 sm:h-[3.25rem] sm:max-h-[3.25rem] object-contain object-left",
  auth: "h-24 w-auto max-h-24 object-contain object-left sm:h-28 sm:max-h-28",
} as const;

/** Sidebar thu gọn: chỉ chữ UNI, vừa rail */
const denseCollapsedMark =
  "h-9 w-auto max-h-9 max-w-[3rem] shrink-0 object-contain object-center sm:h-10 sm:max-h-10 sm:max-w-[3.5rem]";

export function BrandLogoLockup({
  showWordmark = true,
  variant = "navbar",
  dense = false,
  className,
  logoClassName,
  priority,
}: BrandLogoLockupProps) {
  const sizeClass = showWordmark ? fullLogo[variant] : denseCollapsedMark;

  return (
    <span className={cn("group/brand inline-flex min-w-0 max-w-full items-center", className)}>
      <BrandLogo
        className={cn(sizeClass, markHover, logoClassName)}
        priority={priority}
        sizes={dense || !showWordmark ? "56px" : variant === "auth" ? "128px" : "64px"}
      />
    </span>
  );
}
