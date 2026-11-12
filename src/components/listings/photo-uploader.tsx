"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, ImagePlus, Loader2, RotateCw, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_ORIGINAL_BYTES,
  MAX_PHOTOS,
  MAX_UPLOAD_BYTES,
  PHOTO_MAX_DIMENSION,
} from "@/lib/listing-schema";

export type UploadedPhoto = { url: string; alt: string };

type Item = {
  key: string;
  /** Set once uploaded. */
  url: string | null;
  /** What to show: the uploaded URL, or a local blob: preview while uploading. */
  preview: string;
  alt: string;
  status: "uploading" | "done" | "error";
  error?: string;
  file?: File;
};

let counter = 0;
const nextKey = () => `p${++counter}`;

/**
 * Pick, upload, reorder, and describe listing photos. The finished list is written to a
 * hidden `photos` input as JSON. `onBusyChange` tells the form when uploads are running.
 */
export function PhotoUploader({
  initial,
  error,
  onBusyChange,
  onChange,
}: {
  initial: UploadedPhoto[];
  error?: string;
  onBusyChange: (busy: boolean) => void;
  onChange: () => void;
}) {
  const [items, setItems] = useState<Item[]>(() =>
    initial.map((p) => ({ key: nextKey(), url: p.url, preview: p.url, alt: p.alt, status: "done" })),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = items.some((i) => i.status === "uploading");
  useEffect(() => onBusyChange(busy), [busy, onBusyChange]);

  const patch = (key: string, p: Partial<Item>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));

  function change(update: (list: Item[]) => Item[]) {
    setItems(update);
    onChange();
  }

  async function upload(key: string, file: File) {
    patch(key, { status: "uploading", error: undefined });
    try {
      const body = new FormData();
      body.append("file", await shrink(file));
      const res = await fetch("/api/uploads", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed. Try again.");
      patch(key, { status: "done", url: json.url });
    } catch (err) {
      patch(key, { status: "error", error: (err as Error).message || "Upload failed. Try again." });
    }
  }

  function addFiles(files: FileList | File[]) {
    setNotice(null);
    const room = MAX_PHOTOS - items.length;
    const picked = Array.from(files);
    const problems: string[] = [];
    const accepted: File[] = [];

    for (const file of picked) {
      if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        problems.push(`${file.name} isn't a JPEG, PNG, or WebP photo.`);
      } else if (file.size > MAX_ORIGINAL_BYTES) {
        problems.push(`${file.name} is over 20 MB.`);
      } else if (accepted.length < room) {
        accepted.push(file);
      }
    }
    if (picked.length - problems.length > room) {
      problems.push(`You can add up to ${MAX_PHOTOS} photos, so some were skipped.`);
    }
    if (problems.length) setNotice(problems.join(" "));
    if (accepted.length === 0) return;

    const added: Item[] = accepted.map((file) => ({
      key: nextKey(),
      url: null,
      preview: URL.createObjectURL(file),
      alt: "",
      status: "uploading",
      file,
    }));
    change((list) => [...list, ...added]);
    for (const item of added) void upload(item.key, item.file!);
  }

  function move(index: number, to: number) {
    change((list) => {
      const next = [...list];
      const [item] = next.splice(index, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function remove(key: string) {
    change((list) => {
      const item = list.find((i) => i.key === key);
      if (item?.preview.startsWith("blob:")) URL.revokeObjectURL(item.preview);
      return list.filter((i) => i.key !== key);
    });
  }

  const value: UploadedPhoto[] = items
    .filter((i) => i.status === "done" && i.url)
    .map((i) => ({ url: i.url!, alt: i.alt.trim() }));

  return (
    <div>
      <input type="hidden" name="photos" value={JSON.stringify(value)} />

      {items.length > 0 && (
        <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Your photos">
          {items.map((item, i) => (
            <li key={item.key} className="flex flex-col gap-1.5">
              <div
                className={cn(
                  "group relative aspect-[4/3] overflow-hidden rounded-2xl bg-cream-dark ring-2",
                  i === 0 ? "ring-gold-400" : "ring-transparent",
                  item.status === "error" && "ring-red-300",
                )}
              >
                {/* Blob previews can't go through next/image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.preview}
                  alt={item.alt || `Photo ${i + 1}`}
                  className={cn("size-full object-cover", item.status !== "done" && "opacity-50")}
                />
                {i === 0 && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-gold-400 px-2 py-0.5 text-xs font-bold text-bruin-800">
                    <Star className="size-3" aria-hidden />
                    Cover
                  </span>
                )}
                {item.status === "uploading" && (
                  <span className="absolute inset-0 flex items-center justify-center" role="status">
                    <Loader2 className="size-7 animate-spin text-bruin-700" aria-hidden />
                    <span className="sr-only">Uploading photo {i + 1}</span>
                  </span>
                )}
                {item.status === "error" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 p-2 text-center">
                    <p className="flex items-start gap-1 text-xs font-semibold text-red-700">
                      <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
                      {item.error}
                    </p>
                    {item.file && (
                      <button
                        type="button"
                        onClick={() => upload(item.key, item.file!)}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-bruin-700 shadow-soft"
                      >
                        <RotateCw className="size-3" aria-hidden />
                        Retry
                      </button>
                    )}
                  </div>
                )}
                <div className="absolute right-1.5 bottom-1.5 flex gap-1">
                  <TileButton label={`Move photo ${i + 1} earlier`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                    <ArrowLeft className="size-3.5" />
                  </TileButton>
                  <TileButton
                    label={`Move photo ${i + 1} later`}
                    disabled={i === items.length - 1}
                    onClick={() => move(i, i + 1)}
                  >
                    <ArrowRight className="size-3.5" />
                  </TileButton>
                  {i !== 0 && (
                    <TileButton label={`Make photo ${i + 1} the cover`} onClick={() => move(i, 0)}>
                      <Star className="size-3.5" />
                    </TileButton>
                  )}
                  <TileButton label={`Remove photo ${i + 1}`} onClick={() => remove(item.key)} danger>
                    <Trash2 className="size-3.5" />
                  </TileButton>
                </div>
              </div>
              <label className="sr-only" htmlFor={`alt-${item.key}`}>
                Describe photo {i + 1}
              </label>
              <input
                id={`alt-${item.key}`}
                value={item.alt}
                maxLength={120}
                placeholder="What’s shown? e.g. Bedroom"
                onChange={(e) => {
                  patch(item.key, { alt: e.target.value });
                  onChange();
                }}
                className="h-8 w-full rounded-lg border border-line bg-white px-2.5 text-xs text-ink placeholder:text-muted/70 focus:border-bruin-400 focus:ring-2 focus:ring-bruin-100 focus:outline-none"
              />
            </li>
          ))}
        </ul>
      )}

      {items.length < MAX_PHOTOS && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors",
            dragging ? "border-bruin-400 bg-bruin-50" : "border-line bg-cream/60",
            error && "border-red-300",
          )}
        >
          <ImagePlus className="size-8 text-bruin-400" aria-hidden />
          <p className="mt-2 font-bold text-ink">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-bruin-600 underline-offset-2 hover:underline"
            >
              Choose photos
            </button>{" "}
            <span className="hidden sm:inline">or drag them here</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            JPEG, PNG, or WebP · up to {MAX_PHOTOS} photos · {MAX_PHOTOS - items.length} left
          </p>
          <input
            ref={inputRef}
            id="photos-input"
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {(notice || error) && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {notice ?? error}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        The first photo is the cover. We remove location data from your photos before saving them.
      </p>
    </div>
  );
}

function TileButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full bg-white/95 shadow-sm transition-colors disabled:opacity-40",
        danger ? "text-red-600 hover:bg-red-50" : "text-bruin-700 hover:bg-bruin-50",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Shrink big phone photos in the browser before uploading (faster on campus Wi-Fi, and
 * keeps uploads under the server's 4 MB limit). Falls back to the original file if the
 * browser can't decode it.
 */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= MAX_UPLOAD_BYTES) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    return blob ?? file;
  } catch {
    return file;
  }
}
