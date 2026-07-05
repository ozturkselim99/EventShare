"use client";

import { useState, type ReactNode } from "react";

interface Props {
  thumbnailUrl?: string | null;
  originalUrl?: string | null;
  alt?: string;
  className?: string;
  fallback?: ReactNode;
}

export function VideoThumbnail({
  thumbnailUrl,
  originalUrl,
  alt = "Video önizleme",
  className = "",
  fallback,
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  if (thumbnailUrl && !imgFailed) {
    return (
      <img
        src={thumbnailUrl}
        alt={alt}
        loading="lazy"
        onError={() => setImgFailed(true)}
        className={className}
      />
    );
  }

  if (originalUrl) {
    return (
      <video
        src={originalUrl}
        preload="metadata"
        muted
        playsInline
        aria-label={alt}
        className={className}
      />
    );
  }

  return <>{fallback}</>;
}
