'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

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
  const [copyFailed, setCopyFailed] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const queueReset = useCallback(() => {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      setCopyFailed(false);
    }, 2500);
  }, []);

  const trackCopyEvent = useCallback((status: 'success' | 'failed', method: 'clipboard_api' | 'execCommand' | 'none') => {
    if (typeof window === 'undefined' || typeof (window as any).gtag !== 'function') {
      return;
    }

    try {
      (window as any).gtag('event', 'copy_all_lyrics', {
        event_category: 'lyrics_engagement',
        event_label: songTitle || 'Unknown Song Lyrics',
        content_type: 'text',
        item_id: window.location.pathname,
        song_title: songTitle || undefined,
        copy_status: status,
        copy_method: method,
        lyrics_length: plainText.length,
      });
    } catch {
      // ignore analytics failures
    }
  }, [plainText.length, songTitle]);

  const handleCopy = useCallback(async () => {
    const payload = songTitle
      ? `${songTitle}\n\n${plainText}`
      : plainText;
    const copyMethod: 'clipboard_api' | 'execCommand' = typeof navigator.clipboard?.writeText === 'function'
      ? 'clipboard_api'
      : 'execCommand';

    try {
      if (copyMethod === 'clipboard_api') {
        await navigator.clipboard.writeText(payload);
        trackCopyEvent('success', 'clipboard_api');
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
        trackCopyEvent('success', 'execCommand');
      }
      setCopyFailed(false);
      setCopied(true);
      queueReset();
    } catch {
      setCopied(false);
      setCopyFailed(true);
      trackCopyEvent('failed', copyMethod);
      queueReset();
    }
  }, [plainText, queueReset, songTitle, trackCopyEvent]);

  const buttonLabel = copied
    ? '✓ All lyrics copied!'
    : copyFailed
      ? 'Copy failed. Try again'
      : '📋 Copy all lyrics';

  return (
    <div className="flex justify-end mb-3">
      <button
        type="button"
        onClick={handleCopy}
        className={`copy-all-btn text-sm px-4 py-2 rounded-full font-medium transition-colors ${copied ? 'is-success' : ''} ${copyFailed ? 'is-error' : ''}`}
        aria-label={copied ? 'All lyrics copied!' : copyFailed ? 'Copy failed. Try again' : 'Copy all lyrics'}
        title={copied ? 'All lyrics copied!' : copyFailed ? 'Copy failed. Try again' : 'Copy all lyrics to clipboard'}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
