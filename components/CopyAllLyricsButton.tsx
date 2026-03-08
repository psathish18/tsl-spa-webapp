'use client';

import { useState, useCallback } from 'react';

interface CopyAllLyricsButtonProps {
  /** All lyrics as plain text (stanzas joined by \n\n) */
  plainText: string;
  /** Song title for the copy payload header */
  songTitle?: string;
}

/**
 * "Copy All Lyrics" button rendered at the top of the lyrics section.
 * Copies the full lyrics to clipboard with the song title as a header.
 */
export default function CopyAllLyricsButton({
  plainText,
  songTitle,
}: CopyAllLyricsButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const payload = songTitle
      ? `${songTitle}\n\n${plainText}`
      : plainText;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else {
        // Legacy fallback for browsers that don't support the Clipboard API
        const ta = document.createElement('textarea');
        ta.value = payload;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        // execCommand is deprecated but provides a fallback for older browsers
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* silently ignore */
    }
  }, [plainText, songTitle]);

  return (
    <div className="flex justify-end mb-3">
      <button
        type="button"
        onClick={handleCopy}
        className="copy-all-btn text-sm px-4 py-2 rounded-full font-medium transition-colors"
        aria-label={copied ? 'All lyrics copied!' : 'Copy all lyrics'}
        title={copied ? 'All lyrics copied!' : 'Copy all lyrics to clipboard'}
      >
        {copied ? '✓ All lyrics copied!' : '📋 Copy all lyrics'}
      </button>
    </div>
  );
}
