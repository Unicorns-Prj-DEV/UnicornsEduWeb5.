import { BrandLogoLockup } from "@/components/BrandLogoLockup";
import { Skeleton } from "@/components/ui/skeleton";

type AuthCardSkeletonProps = {
  fieldCount?: number;
  showInlineActions?: boolean;
  showDivider?: boolean;
  showSecondaryButton?: boolean;
  footerRows?: number;
};

export function AuthCardSkeleton({
  fieldCount = 2,
  showInlineActions = false,
  showDivider = false,
  showSecondaryButton = false,
  footerRows = 1,
}: AuthCardSkeletonProps) {
  return (
    <div
      className="flex min-h-dvh items-start justify-center bg-bg-primary px-4 py-6 sm:items-center sm:py-10"
      aria-busy="true"
    >
      <div className="w-full max-w-md motion-fade-up">
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-lg sm:p-8">
          <div className="mb-6 flex justify-center px-1 sm:mb-8">
            <BrandLogoLockup
              variant="auth"
              className="max-w-full flex-wrap justify-center"
              priority
            />
          </div>

          <div className="mb-6 flex justify-center">
            <Skeleton className="h-8 w-36 bg-bg-tertiary" />
          </div>

          <div className="space-y-4">
            {Array.from({ length: fieldCount }).map((_, index) => (
              <div key={index}>
                <Skeleton className="mb-1 h-4 w-32 bg-bg-tertiary" />
                <Skeleton className="h-11 w-full bg-bg-tertiary" />
              </div>
            ))}

            {showInlineActions ? (
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-36 bg-bg-tertiary" />
                <Skeleton className="h-4 w-24 bg-bg-tertiary" />
              </div>
            ) : null}

            <Skeleton className="h-11 w-full bg-bg-tertiary" />
          </div>

          {showDivider ? (
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-default" />
              </div>
              <div className="relative flex justify-center">
                <Skeleton className="h-4 w-12 bg-bg-tertiary" />
              </div>
            </div>
          ) : null}

          {showSecondaryButton ? <Skeleton className="h-11 w-full bg-bg-tertiary" /> : null}

          <div className="mt-6 space-y-2">
            {Array.from({ length: footerRows }).map((_, index) => (
              <div key={index} className="flex justify-center">
                <Skeleton className="h-4 w-40 bg-bg-tertiary" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
