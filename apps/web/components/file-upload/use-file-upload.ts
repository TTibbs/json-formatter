"use client";

import { useState, useCallback, useRef } from "react";

export type UploadStatus = "idle" | "uploading" | "success" | "error";

export interface FileState {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  preview?: string;
  error?: string;
  controller?: AbortController;
}

export interface UseFileUploadOptions {
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  maxConcurrentUploads?: number;
  onUpload?: (
    file: File,
    onProgress: (progress: number) => void,
    signal: AbortSignal,
  ) => Promise<void>;
}

function generateId() {
  return Math.random().toString(36).slice(2);
}

function fileMatchesAccept(file: File, accept?: string) {
  if (!accept) return true;
  return accept.split(",").some((type) => {
    type = type.trim();
    if (type.endsWith("/*")) {
      return file.type.startsWith(type.replace("/*", ""));
    }
    return file.type === type;
  });
}

function isDuplicate(file: File, existing: FileState[]) {
  return existing.some(
    (f) =>
      f.file.name === file.name &&
      f.file.size === file.size &&
      f.file.lastModified === file.lastModified,
  );
}

export function useFileUpload({
  maxFiles = 10,
  maxSize,
  accept,
  maxConcurrentUploads = 3,
  onUpload,
}: UseFileUploadOptions) {
  const [files, setFiles] = useState<FileState[]>([]);
  const queueRef = useRef<FileState[]>([]);
  const activeUploads = useRef(0);

  const processQueue = useCallback(() => {
    if (!onUpload) return;

    while (
      activeUploads.current < maxConcurrentUploads &&
      queueRef.current.length > 0
    ) {
      const next = queueRef.current.shift();
      if (!next) return;

      activeUploads.current++;

      setFiles((prev) =>
        prev.map((f) => (f.id === next.id ? { ...f, status: "uploading" } : f)),
      );

      const controller = new AbortController();

      onUpload(
        next.file,
        (progress) => {
          setFiles((prev) =>
            prev.map((f) => (f.id === next.id ? { ...f, progress } : f)),
          );
        },
        controller.signal,
      )
        .then(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === next.id ? { ...f, status: "success", progress: 100 } : f,
            ),
          );
        })
        .catch((err) => {
          if (controller.signal.aborted) return;

          setFiles((prev) =>
            prev.map((f) =>
              f.id === next.id
                ? { ...f, status: "error", error: err?.message }
                : f,
            ),
          );
        })
        .finally(() => {
          activeUploads.current--;
          processQueue();
        });

      setFiles((prev) =>
        prev.map((f) => (f.id === next.id ? { ...f, controller } : f)),
      );
    }
  }, [onUpload, maxConcurrentUploads]);

  const addFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;

      const newFiles: FileState[] = [];

      Array.from(fileList).forEach((file) => {
        if (files.length + newFiles.length >= maxFiles) return;
        if (!fileMatchesAccept(file, accept)) return;
        if (maxSize && file.size > maxSize) return;
        if (isDuplicate(file, files)) return;

        newFiles.push({
          id: generateId(),
          file,
          progress: 0,
          status: "idle",
          preview: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
        });
      });

      setFiles((prev) => [...prev, ...newFiles]);
      queueRef.current.push(...newFiles);

      processQueue();
    },
    [files, maxFiles, maxSize, accept, processQueue],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      file?.controller?.abort();
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const retryFile = useCallback(
    (id: string) => {
      const file = files.find((f) => f.id === id);
      if (!file) return;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: "idle", progress: 0 } : f,
        ),
      );
      queueRef.current.push({
        ...file,
        status: "idle" as UploadStatus,
        progress: 0,
      });
      processQueue();
    },
    [files, processQueue],
  );

  return {
    files,
    addFiles,
    removeFile,
    retryFile,
  };
}
