"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type AvatarGroupRowItem = {
  id: string;
  src?: string;
  alt: string;
  fallback?: string;
};

export type AvatarGroupRowProps = {
  avatars: AvatarGroupRowItem[];
  maxVisible?: number;
  /** Social proof line shown beside the stack. */
  label?: string;
  /** When set without `label`, renders default “Joined by {count} teams” copy. */
  count?: number;
  countLabel?: (count: number) => string;
  size?: "sm" | "default" | "lg";
  className?: string;
  labelClassName?: string;
};

function getInitials(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function resolveLabel({
  label,
  count,
  countLabel,
}: Pick<AvatarGroupRowProps, "label" | "count" | "countLabel">): string | null {
  if (label) return label;
  if (count == null) return null;
  if (countLabel) return countLabel(count);
  return `Joined by ${count.toLocaleString()} teams`;
}

export function AvatarGroupRow({
  avatars,
  maxVisible = 4,
  label,
  count,
  countLabel,
  size = "default",
  className,
  labelClassName,
}: AvatarGroupRowProps) {
  if (avatars.length === 0) {
    return null;
  }

  const visibleLimit = Math.max(1, maxVisible);
  const visible = avatars.slice(0, visibleLimit);
  const overflow = avatars.length - visible.length;
  const caption = resolveLabel({ label, count, countLabel });
  const avatarHoverClassName =
    "relative z-0 cursor-default transition-transform duration-200 ease-out motion-reduce:transition-none hover:z-10 hover:scale-110 motion-reduce:hover:scale-100 hover:ring-primary/40";

  return (
    <div className={cn("inline-flex max-w-full items-center gap-3", className)}>
      <AvatarGroup>
        {visible.map((item) => {
          const fallback =
            item.fallback ?? (item.src ? undefined : getInitials(item.alt));

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Avatar size={size} className={avatarHoverClassName}>
                  {item.src ? (
                    <AvatarImage src={item.src} alt={item.alt} />
                  ) : null}
                  {fallback ? (
                    <AvatarFallback>{fallback}</AvatarFallback>
                  ) : null}
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={3}>
                {item.alt}
              </TooltipContent>
            </Tooltip>
          );
        })}
        {overflow > 0 ? (
          <AvatarGroupCount
            aria-label={`${overflow} more`}
            className={avatarHoverClassName}
          >
            +{overflow}
          </AvatarGroupCount>
        ) : null}
      </AvatarGroup>
      {caption ? (
        <p
          className={cn(
            "text-sm text-muted-foreground",
            size === "sm" && "text-xs",
            labelClassName,
          )}
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}
