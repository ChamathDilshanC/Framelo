"use client";

import { ImageUp, Upload } from "lucide-react";
import * as React from "react";

import { Spinner } from "@/components/ui/spinner";
import { ACCEPTED_MEDIA_EXTENSIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/store/asset-store";
import type { ResolvedAsset } from "@/types/asset";

interface UploadDropzoneProps {
  onUploaded?: (assets: ResolvedAsset[]) => void;
  compact?: boolean;
}

/** Drag-and-drop plus click-to-browse upload surface. */
export function UploadDropzone({ onUploaded, compact = false }: UploadDropzoneProps) {
  const uploadFiles = useAssetStore((state) => state.uploadFiles);
  const uploading = useAssetStore((state) => state.uploading);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const dragDepth = React.useRef(0);

  async function handleFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    const uploaded = await uploadFiles(files);
    if (uploaded.length > 0) onUploaded?.(uploaded);
  }

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        void handleFiles(event.dataTransfer.files);
      }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 rounded-md border border-dashed text-center transition-colors duration-150",
        compact ? "px-3 py-4" : "px-4 py-7",
        dragging
          ? "border-accent bg-accent-soft"
          : "border-line-strong bg-surface-raised hover:border-accent/40 hover:bg-surface-hover",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MEDIA_EXTENSIONS}
        multiple
        className="sr-only"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
        aria-label="Upload media"
      />

      {uploading ? (
        <Spinner />
      ) : (
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface",
            dragging && "border-accent/50",
          )}
        >
          {dragging ? (
            <ImageUp className="h-4 w-4 text-accent" />
          ) : (
            <Upload className="h-4 w-4 text-ink-subtle" />
          )}
        </span>
      )}

      <div className="space-y-0.5">
        <p className="text-[12px] font-medium text-ink">
          {dragging ? "Drop to upload" : "Drag image or video here"}
        </p>
        <p className="text-[11px] text-ink-subtle">PNG, JPG, WebP, MP4 or WebM</p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-[11px] font-medium text-accent underline-offset-4 transition-colors hover:underline disabled:opacity-50"
      >
        Browse files
      </button>
    </div>
  );
}
