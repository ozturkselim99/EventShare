"use client";

import { useState, useEffect, useCallback } from "react";
import type { MediaRecord } from "@/lib/api-client";

interface Props {
  items: MediaRecord[];
  initialIndex: number;
  onClose: () => void;
}

export function Lightbox({ items, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const item = items[index];

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() =>
    setIndex((i) => Math.min(items.length - 1, i + 1)), [items.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [prev, next, onClose]);

  if (!item) return null;

  async function download() {
    const url = item?.originalUrl ?? item?.thumbnailUrl;
    if (!url) return;
    
    try {
      // Fetch the file to bypass CORS issues
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `eventshare-${item?.id}.${item?.type === "IMAGE" ? "jpg" : "mp4"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      // Fallback to direct link if fetch fails
      const a = document.createElement("a");
      a.href = url;
      a.download = `eventshare-${item?.id}`;
      a.click();
    }
  }

  function share() {
    if (navigator.share && item?.originalUrl) {
      navigator.share({ url: item.originalUrl }).catch(() => null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Kapatma butonu - daha görünür */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-all hover:scale-110"
          aria-label="Kapat"
          title="Kapat (ESC)"
        >
          <span className="text-3xl leading-none -mt-0.5">×</span>
        </button>

        {item.type === "IMAGE" ? (
          <img
            src={item.originalUrl ?? item.thumbnailUrl ?? ""}
            alt=""
            className="max-h-[80vh] max-w-full rounded-xl object-contain"
          />
        ) : (
          <video
            src={item.originalUrl ?? ""}
            controls
            autoPlay
            className="max-h-[80vh] max-w-full rounded-xl"
          />
        )}

        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={prev}
            disabled={index === 0}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-30"
          >
            ‹
          </button>
          <span className="text-white/60 text-sm">
            {index + 1} / {items.length}
          </span>
          <button
            onClick={next}
            disabled={index === items.length - 1}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-30"
          >
            ›
          </button>
          <button
            onClick={download}
            className="ml-4 px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition"
          >
            İndir
          </button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              onClick={share}
              className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition"
            >
              Paylaş
            </button>
          )}
        </div>

        {item.uploadedBy && (
          <p className="text-white/40 text-xs mt-2">
            Yükleyen: {item.uploadedBy}
          </p>
        )}
      </div>
    </div>
  );
}
