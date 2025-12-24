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
                className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors opacity-90"
                snippetWithStars={snippetWithStars}
                hashtagsStr={hashtagsStr}
                pagePath={pagePath}
                itemCat={itemCat}
              >
                Tweet !!!
              </ShareButton>
              <ShareButton
                href={whatsappHref}
                platform="whatsapp"
                className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 transition-colors opacity-90"
                snippetWithStars={snippetWithStars}
                hashtagsStr={hashtagsStr}
                pagePath={pagePath}
                itemCat={itemCat}
              >
                WhatsApp !!!
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
