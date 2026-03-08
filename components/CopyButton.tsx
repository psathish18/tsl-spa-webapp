'use client';

import { useState, useCallback } from 'react';

interface CopyButtonProps {
  /** Plain-text string to write to clipboard */
  text: string;
  /** Optional accessible label override */
  label?: string;
}

/**
 * Minimal clipboard copy button for a single stanza.
 * Shows a brief "Copied!" confirmation for 2 s after success.
 */
export default function CopyButton({ text, label = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Legacy fallback for browsers that don't support the Clipboard API
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        // execCommand is deprecated but provides a fallback for older browsers
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silently ignore – clipboard may be blocked in some contexts */
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="share-pill copy"
      aria-label={copied ? 'Copied!' : label}
      title={copied ? 'Copied!' : label}
    >
      {copied ? '✓ Copied!' : '📋 Copy'}
    </button>
  );
}
