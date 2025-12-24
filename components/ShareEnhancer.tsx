"use client";

import React, { useEffect } from 'react';

export function ShareEnhancer() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const anchor = (el.closest && el.closest('a')) as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.href || '';
      if (!href) return;

      // Only handle known share links (twitter intent or whatsapp)
    if (href.includes('twitter.com/intent/tweet') || href.includes('api.whatsapp.com/send')) {
        e.preventDefault();
        try {
          // Build payload similar to previous ShareButton
          const method = href.includes('whatsapp') ? 'Whatsapp' : 'Twitter';
          const item_id = document.location.href || '';
      const value = anchor.getAttribute('data-snippet') || anchor.dataset?.snippet || '';
      const hash_tags = anchor.getAttribute('data-hashtags') || anchor.dataset?.hashtags || '';
      const item_cat = anchor.getAttribute('data-itemcat') || anchor.dataset?.itemcat || undefined;
      // Diagnostic logging
      // console.log('ShareEnhancer intercepted anchor:', { href, method, item_id, valueLength: (value||'').length, hash_tags, item_cat });
          const payload: any = { method, content_type: 'text', item_id, value, hash_tags, item_cat };
          if (typeof (window as any).gtag === 'function') {
            try { (window as any).gtag('event', 'share', payload); } catch (err) { console.warn('gtag event failed', err); }
          }
        } finally {
          // let the browser open the share URL after a tiny delay
          setTimeout(() => { window.open(href, '_blank', 'noopener'); }, 200);
        }
      }
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}

export default ShareEnhancer;
