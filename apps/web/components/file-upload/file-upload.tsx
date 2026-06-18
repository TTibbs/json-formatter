"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  useFileUpload,
  UseFileUploadOptions,
} from "@/components/file-upload/use-file-upload";
import { Button } from "@/components/ui/button";
import { RotateCcw, X, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

export function FileUpload({ onUpload }: UseFileUploadOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const { files, addFiles, removeFile, retryFile } = useFileUpload({
    onUpload,
    accept: "image/*,application/pdf",
    maxSize: 5_000_000,
  });

  const isEngaged = files.length > 0;

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        addFiles(e.dataTransfer.files);
      }}
      className={cn(
        "group relative cursor-pointer rounded-xl border-2 border-dashed transition-all",
        "bg-linear-to-br from-background to-muted/40 dark:from-background dark:to-muted/40",
        "hover:border-primary/60 hover:bg-muted/60 dark:hover:border-primary/60 dark:hover:bg-muted/60",
        drag && "border-primary bg-primary/10 scale-[1.01]",
        isEngaged && "border-primary/40 bg-muted/40",
        isEngaged ? "p-4" : "p-10",
      )}
    >
      <Input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {/* EMPTY STATE */}
      {!isEngaged && (
        <div className="flex flex-col items-center justify-center gap-3">
          <div
            className={cn(
              "rounded-full p-4 transition-all",
              "bg-primary/10 text-primary",
              "group-hover:scale-110",
              drag && "scale-110 bg-primary/20",
            )}
          >
            <AnimatedUploadIcon active={drag} engaged={isEngaged} />
          </div>

          <div className="text-center">
            <p className="text-sm font-medium">
              {drag ? "Drop files here" : "Upload your files"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Drag & drop or click to browse
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Images & PDFs up to 5MB
          </p>
        </div>
      )}

      {/* FILES INSIDE */}
      {isEngaged && (
        <div className="space-y-2">
          <div
            className="flex items-center justify-between px-1"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-muted-foreground">
              {files.length} file{files.length > 1 && "s"} uploaded
            </p>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="h-7 px-2 text-xs"
            >
              Add more
            </Button>
          </div>
          {files.map((f) => (
            <div
              key={f.id}
              className={cn(
                "group flex items-center gap-3 rounded-lg border p-2 transition-all",
                "bg-background/70 backdrop-blur-sm",
                "hover:border-muted-foreground/30",
                f.status === "error" &&
                  "border-destructive/40 bg-destructive/5",
                f.status === "success" && "border-green-500/40 bg-green-500/5",
              )}
            >
              {/* Preview */}
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                {f.preview ? (
                  <img src={f.preview} className="h-full w-full object-cover" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{f.file.name}</p>

                {f.status === "uploading" && (
                  <div className="mt-1">
                    <div className="h-1 w-full bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {f.status === "error" && (
                  <p className="text-[11px] text-destructive mt-1">Failed</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                {f.status === "error" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      retryFile(f.id);
                    }}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(f.id);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnimatedUploadIcon({
  active,
  engaged,
}: {
  active: boolean;
  engaged: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Cloud */}
      <path d="M20 17.5a4.5 4.5 0 0 0-1-8.9 5.5 5.5 0 0 0-10.9 1.5A4 4 0 0 0 4 14a4 4 0 0 0 4 4h12z" />

      <motion.g
        animate={
          engaged
            ? {
                y: 0,
                opacity: 1,
              }
            : active
            ? {
                y: -4,
                opacity: 1,
              }
            : {
                y: [2, -4, 2],
                opacity: [0.7, 1, 0.7],
              }
        }
        transition={
          engaged
            ? { duration: 0.2 }
            : active
            ? {
                duration: 0.25,
                ease: "easeOut",
              }
            : {
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.4,
              }
        }
      >
        <path d="M12 16V10" />
        <path d="M9 13l3-3 3 3" />
      </motion.g>
    </svg>
  );
}
