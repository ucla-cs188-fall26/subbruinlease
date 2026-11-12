"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Images, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ListingImage } from "@/lib/types";

type Photo = Pick<ListingImage, "id" | "url" | "alt">;

/**
 * Listing photos. Desktop: a mosaic (cover + up to 4 tiles). Phones: a swipeable
 * carousel. Tapping any photo opens a full-screen viewer with arrow-key support.
 */
export function PhotoGallery({ photos, title }: { photos: Photo[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[16/9] max-h-[420px] w-full flex-col items-center justify-center gap-2 rounded-card bg-cream-dark text-muted">
        <ImageOff className="size-8" aria-hidden />
        <p className="text-sm font-semibold">No photos yet</p>
      </div>
    );
  }

  return (
    <>
      <MobileCarousel photos={photos} onOpen={setOpen} />
      <Mosaic photos={photos} onOpen={setOpen} />
      {open !== null && (
        <Lightbox photos={photos} title={title} start={open} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

function Mosaic({ photos, onOpen }: { photos: Photo[]; onOpen: (i: number) => void }) {
  const n = photos.length;
  const tiles = photos.slice(1, n >= 5 ? 5 : 3);
  const hiddenCount = n - 1 - tiles.length;

  return (
    <div
      className={cn(
        "relative hidden h-[420px] gap-2 overflow-hidden rounded-card sm:grid",
        n === 1 && "grid-cols-1",
        n === 2 && "grid-cols-2",
        (n === 3 || n === 4) && "grid-cols-3 grid-rows-2",
        n >= 5 && "grid-cols-4 grid-rows-2",
      )}
    >
      <Tile photo={photos[0]} index={0} onOpen={onOpen} priority className={n >= 3 ? "col-span-2 row-span-2" : ""} sizes="(min-width: 1024px) 640px, 66vw" />
      {tiles.map((p, i) => (
        <Tile key={p.id} photo={p} index={i + 1} onOpen={onOpen} sizes="(min-width: 1024px) 320px, 33vw" />
      ))}
      {n > 1 && (
        <button
          type="button"
          onClick={() => onOpen(0)}
          className="absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-bold text-ink shadow-soft transition-colors hover:bg-white"
        >
          <Images className="size-4" aria-hidden />
          {hiddenCount > 0 ? `Show all ${n} photos` : "View photos"}
        </button>
      )}
    </div>
  );
}

function Tile({
  photo,
  index,
  onOpen,
  priority,
  sizes,
  className,
}: {
  photo: Photo;
  index: number;
  onOpen: (i: number) => void;
  priority?: boolean;
  sizes: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      className={cn("group relative overflow-hidden bg-cream-dark", className)}
      aria-label={`Open photo ${index + 1}: ${photo.alt}`}
    >
      <Image
        src={photo.url}
        alt={photo.alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
    </button>
  );
}

function MobileCarousel({ photos, onOpen }: { photos: Photo[]; onOpen: (i: number) => void }) {
  const [current, setCurrent] = useState(0);

  return (
    <div className="relative -mx-4 sm:hidden">
      <div
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget;
          setCurrent(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onOpen(i)}
            className="relative aspect-[4/3] w-full shrink-0 snap-center bg-cream-dark"
            aria-label={`Open photo ${i + 1}: ${p.alt}`}
          >
            <Image src={p.url} alt={p.alt} fill priority={i === 0} sizes="100vw" className="object-cover" />
          </button>
        ))}
      </div>
      {photos.length > 1 && (
        <span className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-bold text-white">
          {current + 1} / {photos.length}
        </span>
      )}
    </div>
  );
}

function Lightbox({
  photos,
  title,
  start,
  onClose,
}: {
  photos: Photo[];
  title: string;
  start: number;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(start);
  const n = photos.length;
  const go = (delta: number) => setIndex((i) => (i + delta + n) % n);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const photo = photos[index];

  return (
    <dialog
      ref={ref}
      aria-label={`Photos of ${title}`}
      onClose={onClose}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink p-0 text-white backdrop:bg-ink/80"
    >
      {/* Clicking empty space (not a photo or control) closes the viewer. */}
      <div className="flex h-full flex-col" onClick={(e) => e.target === e.currentTarget && ref.current?.close()}>
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <p className="text-sm font-bold" aria-live="polite">
            {index + 1} / {n}
            <span className="ml-3 font-normal text-white/70">{photo.alt}</span>
          </p>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-white/10"
            aria-label="Close photos"
            autoFocus
          >
            <X className="size-6" aria-hidden />
          </button>
        </div>

        <div className="relative min-h-0 flex-1" onClick={(e) => e.target === e.currentTarget && ref.current?.close()}>
          <Image
            key={photo.id}
            src={photo.url}
            alt={photo.alt}
            fill
            sizes="100vw"
            className="object-contain px-2 sm:px-20"
          />
          {n > 1 && (
            <>
              <NavButton side="left" onClick={() => go(-1)} />
              <NavButton side="right" onClick={() => go(1)} />
            </>
          )}
        </div>

        {n > 1 && (
          <div className="flex justify-center gap-2 overflow-x-auto px-4 py-4">
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative size-14 shrink-0 overflow-hidden rounded-lg ring-2 transition-opacity",
                  i === index ? "ring-gold-400" : "opacity-60 ring-transparent hover:opacity-100",
                )}
              >
                <Image src={p.url} alt="" fill sizes="56px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={cn(
        "absolute top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur transition-colors hover:bg-white/30",
        side === "left" ? "left-3 sm:left-6" : "right-3 sm:right-6",
      )}
    >
      <Icon className="size-6" aria-hidden />
    </button>
  );
}
