'use client';

import { useState } from 'react';

interface StanzaMeaningToggleProps {
  /** Sanitised HTML of the English meaning stanza */
  meaningHtml: string;
}

/**
 * Inline "Show English meaning" toggle shown below each Tanglish stanza.
 * Renders only when `meaningHtml` is non-empty.
 */
export default function StanzaMeaningToggle({ meaningHtml }: StanzaMeaningToggleProps) {
  const [show, setShow] = useState(false);

  if (!meaningHtml) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="meaning-toggle-btn text-xs font-medium transition-colors"
        aria-expanded={show}
        aria-controls="stanza-meaning"
      >
        {show ? '▲ Hide meaning' : '▼ Show English meaning'}
      </button>
      {show && (
        <div
          id="stanza-meaning"
          className="meaning-block mt-2 text-sm italic border-l-2 pl-3 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: meaningHtml }}
        />
      )}
    </div>
  );
}
