"use client";

import { useEffect, useState } from "react";

interface NativeShareButtonProps {
  title: string;
  snippet: string;
  hashtags: string;
  pageUrl: string;
  itemCat?: string;
  className?: string;
}

export default function NativeShareButton({
  title,
  snippet,
  hashtags,
  pageUrl,
  itemCat,
  className = "",
}: NativeShareButtonProps) {
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  if (!canShare) {
    return null;
  }

  async function handleShare() {
    const shareText = [snippet, hashtags].filter(Boolean).join("\n\n");

    try {
      await navigator.share({
        title,
        text: shareText,
        url: pageUrl,
      });

      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", "share", {
          method: "NativeShare",
          content_type: "text",
          item_id: pageUrl,
          value: snippet,
          hash_tags: hashtags,
          item_cat: itemCat,
        });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.warn("Native share failed", error);
    }
  }

  return (
    <button type="button" onClick={handleShare} className={className} aria-label="Share snippet">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
      </svg>
      <span className="sr-only">Share snippet</span>
    </button>
  );
}