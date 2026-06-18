import { cn } from "@/lib/utils";
import type { MockupScreenProps } from "./types";

/**
 * - `contain` - full image visible, width-first (best for landscape / desktop screenshots)
 * - `cover` - fills frame, crops edges (best for portrait mobile screenshots ~9:16–9:19)
 */
export type MockupImageFit = "contain" | "cover";

export type MockupImagePosition = "top" | "center" | "bottom";

export type FrameScreenProps = MockupScreenProps & {
  imageFit?: MockupImageFit;
  imagePosition?: MockupImagePosition;
  imageBackdrop?: boolean;
  screenClassName?: string;
  /** Phone uses centered flex layout for contain; other mockups use absolute fill. */
  layout?: "fill" | "centered";
};

export function FrameScreen({
  children,
  image,
  imageAlt = "Screen content",
  className,
  viewportClassName,
  screenScrollable,
  imageFit = "contain",
  imagePosition = "center",
  imageBackdrop = true,
  screenClassName,
  layout = "fill",
}: FrameScreenProps) {
  const positionClass =
    imagePosition === "top"
      ? "object-top"
      : imagePosition === "bottom"
      ? "object-bottom"
      : "object-center";

  const src = image || "/placeholder.svg";

  if (children) {
    const scrollable = screenScrollable !== false;

    return (
      <div
        className={cn(
          "relative flex size-full min-h-0 flex-col overflow-hidden bg-background",
          screenClassName,
          viewportClassName,
          className,
        )}
      >
        {scrollable ? (
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y">
            <div className="min-h-0 w-full *:min-h-0!">{children}</div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden *:min-h-0! *:h-full">
            {children}
          </div>
        )}
      </div>
    );
  }

  if (layout === "centered" && imageFit === "contain") {
    return (
      <div
        className={cn(
          "relative flex size-full items-center justify-center overflow-hidden",
          screenClassName,
          className,
        )}
      >
        {imageBackdrop && image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            aria-hidden
            className="absolute inset-0 size-full scale-110 object-cover opacity-35 blur-2xl saturate-150"
          />
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={imageAlt}
          className="relative z-1 max-h-full w-full object-contain object-center"
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative size-full overflow-hidden",
        screenClassName,
        className,
      )}
    >
      {imageBackdrop && imageFit === "contain" && image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full scale-110 object-cover opacity-35 blur-2xl saturate-150"
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={imageAlt}
        className={cn(
          "relative z-1 size-full",
          imageFit === "cover" ? "object-cover" : "object-contain",
          positionClass,
          layout === "centered"
            ? "max-h-full w-full object-contain"
            : "absolute inset-0",
        )}
        decoding="async"
      />
    </div>
  );
}
