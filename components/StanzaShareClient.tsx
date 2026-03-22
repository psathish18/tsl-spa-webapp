"use client";

import React, { useEffect } from "react";
import { ShareButton } from "./ShareButton";

interface StanzaShareProps {
  stanzas: string[]; // pre-sanitized HTML stanza fragments
  song: any;
  pagePath: string;
}

export function StanzaShareClient({ stanzas, song, pagePath }: StanzaShareProps) {

  // Check if song has EnglishTranslation category - if so, skip stanza splitting
  const hasEnglishTranslation = song.category?.some((cat: any) => 
    cat.term && cat.term.toLowerCase().includes('englishtranslation')
  );

  useEffect(() => {
    try {
      const container = document.querySelector('[data-server-stanzas-count]') as HTMLElement | null;
      const serverCount = container ? Number(container.getAttribute('data-server-stanzas-count')) : null;
      // console.log('StanzaShareClient mounted. serverCount=', serverCount, 'clientCount=', stanzas.length);
      if (serverCount !== null && serverCount !== stanzas.length) {
        console.warn('Hydration mismatch: server stanzas != client stanzas', { serverCount, clientCount: stanzas.length });
      }
    } catch (e) {
      console.warn('StanzaShareClient mount diagnostics failed', e);
    }
  }, [stanzas]);


  function truncateForTwitter(text: string, max = 240) {
    if (text.length <= max) return text;
    return text.slice(0, max - 1).trim() + '…';
  }

  const hashtagList = (song.category || [])
    .map((c: any) => c.term || '')
    .filter((t: string) => !t.startsWith('Song:') && !!t)
    .map((t: string) => t.replace(/^[^:]*:/, '').trim())
    .map((v: string) => v.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .map((v: string) => `#${v}`);
  const hashtagsStr = hashtagList.join(' ');

  // Find Song: category for item_cat
  let itemCat = '';
  if (song.category) {
    const songCat = song.category.find((cat: any) => cat.term && cat.term.startsWith('Song:'));
    if (songCat) itemCat = songCat.term;
  }

  return (
    <>
      {hasEnglishTranslation ? (
        // Don't split into stanzas for English translations - render as single block
        <div className="mb-6" suppressHydrationWarning>
          <div dangerouslySetInnerHTML={{ __html: stanzas.join('<br/><br/>') }} />
        </div>
      ) : (
        // Normal stanza splitting with share buttons
        stanzas.map((stanzaHtml, idx) => {
        // stanzaHtml is pre-sanitized server-side
        const cleanStanzaHtml = stanzaHtml;

        // Convert HTML stanza to plain text for tweet body
        const withNewlines = cleanStanzaHtml.replace(/<br\s*\/?/gi, '\n');
        const stripped = withNewlines.replace(/<[^>]+>/g, '');
        const plain = stripped.split('\n').map(line => line.replace(/\s+/g, ' ').trim()).join('\n').trim();
        const snippetWithStars = `⭐${plain}⭐`;
        const snippetWithBreaks = `${snippetWithStars}\n\n`;
        const hashtagsLine = hashtagsStr ? `${hashtagsStr}\n` : '';
        const pageWithVia = `${pagePath} via @tsongslyrics`;
        const fullText = `${snippetWithBreaks}${hashtagsLine}${pageWithVia}`;

        const textForTweet = `${snippetWithBreaks}${hashtagsLine}`.trim();
        const tweetText = truncateForTwitter(textForTweet);
        const encodedUrl = encodeURIComponent(pagePath);
        const twitterHref = `https://twitter.com/intent/tweet?via=tsongslyrics&url=${encodedUrl}&text=${encodeURIComponent(tweetText)}`;
        const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;

        return (
          <div key={idx} className="mb-6" suppressHydrationWarning>
            <div dangerouslySetInnerHTML={{ __html: cleanStanzaHtml }} />
            <div className="mt-3 flex justify-end items-center gap-3 text-sm text-gray-600">
              <ShareButton
                href={twitterHref}
                platform="twitter"
                className="share-pill icon-only twitter"
                aria-label="Share stanza on X"
                title="Share stanza on X"
                snippetWithStars={snippetWithStars}
                hashtagsStr={hashtagsStr}
                pagePath={pagePath}
                itemCat={itemCat}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M18.244 2H21l-6.02 6.879L22 22h-5.486l-4.297-8.02L5.2 22H2.442l6.44-7.36L2 2h5.625l3.884 7.255L18.244 2Zm-.967 18.348h1.527L6.795 3.566H5.156l12.121 16.782Z" />
                </svg>
                <span className="sr-only">Share stanza on X</span>
              </ShareButton>
              <ShareButton
                href={whatsappHref}
                platform="whatsapp"
                className="share-pill icon-only whatsapp"
                aria-label="Share stanza on WhatsApp"
                title="Share stanza on WhatsApp"
                snippetWithStars={snippetWithStars}
                hashtagsStr={hashtagsStr}
                pagePath={pagePath}
                itemCat={itemCat}
              >
                <svg aria-hidden="true" viewBox="0 0 32 32" fill="currentColor" className="h-4 w-4">
                  <path d="M19.11 17.21c-.29-.14-1.7-.84-1.97-.93-.26-.1-.45-.14-.65.15-.19.29-.74.93-.9 1.12-.17.2-.33.22-.62.08-.29-.15-1.2-.44-2.29-1.41-.85-.76-1.42-1.7-1.59-1.98-.17-.29-.02-.44.12-.58.13-.13.29-.33.43-.49.14-.17.19-.29.29-.48.09-.2.05-.37-.02-.52-.08-.14-.65-1.57-.89-2.15-.24-.57-.48-.49-.65-.49h-.55c-.2 0-.52.07-.79.37-.26.29-1.03 1.01-1.03 2.45s1.06 2.84 1.21 3.03c.14.2 2.08 3.18 5.03 4.45.7.3 1.25.48 1.68.61.71.22 1.36.19 1.87.11.57-.08 1.7-.7 1.94-1.38.24-.68.24-1.26.17-1.38-.07-.11-.26-.18-.55-.32Z" />
                  <path d="M27.27 4.69A15.8 15.8 0 0 0 16.03 0C7.31 0 .21 7.1.21 15.82c0 2.78.73 5.5 2.11 7.9L0 32l8.49-2.23a15.8 15.8 0 0 0 7.54 1.92h.01c8.72 0 15.82-7.1 15.82-15.82 0-4.22-1.64-8.18-4.6-11.18Zm-11.23 24.3h-.01a13.13 13.13 0 0 1-6.69-1.84l-.48-.29-5.04 1.32 1.35-4.92-.31-.5a13.09 13.09 0 0 1-2.02-6.94C2.84 8.56 8.77 2.63 16.04 2.63c3.51 0 6.82 1.37 9.3 3.85a13.08 13.08 0 0 1 3.86 9.31c0 7.26-5.92 13.19-13.16 13.2Z" />
                </svg>
                <span className="sr-only">Share stanza on WhatsApp</span>
              </ShareButton>
            </div>
          </div>
        );
      })
      )}
    </>
  );
}

export default StanzaShareClient;
