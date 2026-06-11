"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  value: string;
  children?: React.ReactNode;
  copiedText?: string;
  copyLabel?: string;
  copiedLabel?: string;
  timeoutMs?: number;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  disabled?: boolean;
  onCopied?: () => void;
}

export function CopyButton({
  value,
  children,
  copiedText = "Copied!",
  copyLabel = "Copy",
  copiedLabel = "Copied",
  timeoutMs = 1500,
  className,
  variant = "outline",
  size = "sm",
  disabled,
  onCopied,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), timeoutMs);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={handleCopy}
      className={cn("inline-flex items-center gap-2", className)}
      aria-label={copied ? copiedLabel : copyLabel}
      title={copied ? copiedLabel : copyLabel}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      <span>{copied ? copiedText : (children ?? copyLabel)}</span>
    </Button>
  );
}
