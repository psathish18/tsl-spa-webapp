# Hydration error, stanza splitting, and share flow

Task receipt & plan

- I will summarize the hydration error root cause, the stanza splitting pipeline in `app/[slug]/page.tsx`, and the client-side sharing helpers (`ShareEnhancer`, `StanzaShareClient`) and their data flow.
- Then I’ll list debugging tips, quick fixes already applied, and recommended next steps.

Checklist

- [x] Explain what the hydration error was and why it likely occurred
- [x] Describe stanza-splitting logic and sanitization (server-side)
- [x] Describe how stanzas are passed to the client and rendered
- [x] Describe `ShareEnhancer` behavior and analytics payload flow
- [x] Note diagnostics added and recommended follow-ups

## High-level summary

- Symptom: intermittent hydration/NotFound runtime errors (client console stack referencing React hydration internals). These often occur when the server-rendered HTML subtree does not exactly match what React renders on the client.
- Primary fix applied: remove invalid top-level document wrappers returned from a component (previously `app/global-error.tsx` returned `<html><body>...</body></html>`). Returning a full document inside the React tree causes severe DOM mismatches and hydration failures.
- Additional instrumentation added: server-side attribute `data-server-stanzas-count` on the stanza container, and client mount-time logging in `StanzaShareClient` to compare server vs client stanza counts. ShareEnhancer also logs intercepted anchor dataset values.

## Stanza split + sanitization (server-side)

Contract

- Input: post HTML (raw Blogger post content). May include <img>, <br>, <p>, and other markup.
- Output: an array of sanitized stanza HTML fragments (strings) to be rendered inside the page.

Pipeline (in `app/[slug]/page.tsx`)

1. Fetch post content: `getSongData(slug)` reads the Blogger JSON feed and extracts post HTML.
2. stripImagesFromHtml(html): remove image tags to keep only lyrical text.
3. stanzaSeparator: a regex that splits by groups of two or more break tags or adjacent paragraph boundaries. Example used:

   /(?:<br\b[^>]*>(?:\s*<\/br>)?\s*){2,}|<\/p>\s*<p\b[^>]*>/i

4. rawStanzas: `safeContent.split(stanzaSeparator).map(s => s.trim()).filter(Boolean)` — this yields raw stanza fragments.
5. sanitizeHtml(server-only): each raw stanza is run through `sanitize-html` with server-safe options producing `stanzas` (HTML strings safe to insert).
6. Debug logs are printed server-side (safeContent length, rawStanzas count, stanzas count, first stanza preview).
7. `data-server-stanzas-count={String(stanzas.length)}` is added to the outer container so the client can verify counts at mount.

Notes

- Sanitization is intentionally performed on the server to avoid bundling `sanitize-html` into the client bundle.
- The server produces deterministic sanitized strings; mismatches can still happen if the client mutates DOM or if rendering logic conditionally differs between server/client.

## How stanzas are rendered and passed to the client

- Server renders stanza fragments directly into the page markup using `dangerouslySetInnerHTML` (server-side render output). The page is a server component that embeds sanitized HTML strings.
- Two client-only modules are dynamically imported with CSR-only flags: `ShareEnhancer` and `StanzaShareClient` (dynamic import with `{ ssr: false }`). These modules activate only on the client after hydration.
- The stanza container includes `data-server-stanzas-count` to assert the server count.

Stanza rendering considerations

- The code uses `suppressHydrationWarning` for stanza items in the client renderer to reduce noisy React warnings when innerHTML is used, but this does not remove real mismatches — it only hides the warning.
- Determinism is crucial: ensure no random/locale-specific formatting or conditional DOM nodes are added/removed between server and client.

## ShareEnhancer (client-side) — purpose & behavior

- Purpose: Centralized interception for share anchors (Twitter, WhatsApp) rendered alongside each stanza. Ensures analytics (gtag) events are sent and that the share link opens after analytics are dispatched.

Behavior (typical flow)

1. On client load, `ShareEnhancer` attaches an event listener (delegation) to intercept clicks on anchors matching share selectors (or adds handlers to specific anchors).
2. When a share anchor is clicked:
   - The enhancer reads data attributes from the anchor: `data-snippet` (snippet text), `data-hashtags` (string of hashtags), `data-itemcat` (category), possibly `href` and `target`.
   - It constructs a GA `gtag('event', 'share', {...})` payload that matches the expected keys (method, content_type, item_id, value, hash_tags, item_cat).
   - It either (a) calls `gtag('event', 'share', payload)` and delays opening the share link for a short timeout (setTimeout fallback), or (b) uses a callback/hook if available, or (c) uses `navigator.sendBeacon` as a fallback when appropriate.
   - Finally, it opens the share URL (window.open or location change) so the share UI appears.
3. The enhancer logs intercepted anchor datasets and payload sizes to the console for debugging.

Analytics details

- Client calls `gtag('event', 'share', { method: 'Twitter'|'Whatsapp', content_type: 'text', item_id: postUrl, value: clearText, hash_tags: '...' , item_cat: item_cat })` to match the user's GA schema.
- The enhancer ensures the payload is readable and includes the post URL for attribution.

Reliability notes

- Timing: GA network requests are asynchronous; to make sure analytics is sent before navigation/close, use `navigator.sendBeacon` for analytics where supported, or preventDefault + await a short callback from the gtag library (if gtag supports an event callback) then open the share link.

## StanzaShareClient (client-side) — purpose & behavior

- Purpose: A client component that mounts after hydration, re-renders or hydrates stanza blocks, and provides interactive features (share buttons, click enhancers). It also contains mount-time diagnostics.

Behavior

1. On mount, `StanzaShareClient` reads the container's `data-server-stanzas-count` attribute.
2. It compares serverCount to the client-rendered stanza array length and logs a warning if they differ. This helps detect the source of hydration mismatches.
3. It renders stanza blocks (often using `dangerouslySetInnerHTML` for each sanitized stanza string) and sets `suppressHydrationWarning` to reduce warnings for innerHTML usage.

Important: If client-side logic adds or removes nodes (e.g., injecting anchors or ads conditionally), ensure the same DOM exists on server render or use placeholders on server so the structure is identical.

## Data flow (ASCII diagram)

Server: Blogger API -> getSongData(slug) -> stripImagesFromHtml -> split by stanzaSeparator -> sanitize-html -> server stanzas array

Server render -> page markup (stanzas inserted via innerHTML) + attribute `data-server-stanzas-count` -> delivered to browser

Client: Browser receives HTML -> React hydrates -> `StanzaShareClient` mounts -> reads `data-server-stanzas-count` and logs comparison -> `ShareEnhancer` attaches listeners

User clicks share anchor -> `ShareEnhancer` intercepts -> builds gtag payload -> sends gtag event (or sendBeacon) -> opens share URL

## Files involved (changes & purpose)

- `app/[slug]/page.tsx` — server page that: fetches post content, strips images, splits content into stanzas using the stanzaSeparator regex, sanitizes each stanza (server-only), renders stanza fragments, and adds `data-server-stanzas-count` to the container.
- `app/global-error.tsx` — previously returned `<html><body>` and caused DOM mismatches; fixed to return a normal React subtree.
- `components/StanzaShareClient.tsx` — client renderer for stanza blocks; compares server vs client counts at mount and renders stanza blocks with `suppressHydrationWarning`.
- `components/ShareEnhancer.tsx` — client-side click interceptor that sends GA `gtag` share events and opens share links after dispatching analytics.
- `components/ShareButton.tsx` — fallback per-anchor handler that calls gtag onClick (kept as a fallback but ShareEnhancer centralizes behavior).

## Debugging checklist & how to capture the intermittent hydration error

1. Start dev server with debug logs enabled (already done). Open the page that previously errored.
2. Open Chrome/Firefox devtools Console and Network tab.
3. When the page loads, look for the `StanzaShareClient` mount log comparing serverCount vs clientCount. Copy those logs if they differ.
4. If a hydration error occurs, copy the console stack trace and also "View Page Source" server HTML for the page and paste in a comparison (server HTML vs DOM after hydration).
5. Also capture any ShareEnhancer logs (intercepted anchor dataset, payload) when reproducing share flows.

## Quick recommendations & next steps

- Keep sanitization server-side and avoid importing `sanitize-html` in any client module.
- Ensure deterministic server output:
  - Format dates server-side to fixed string values.
  - Avoid generating random IDs or timestamps in render output.
  - Trim and normalize whitespace where possible before splitting.
- Use `data-server-stanzas-count` as an assertion; if mismatch observed: inspect whether the client adds/removes nodes (e.g., ad placeholders, conditional content) or if the split regex sometimes yields an extra empty segment.
- For analytics reliability, consider `navigator.sendBeacon` fallback or using `gtag` event callbacks + preventDefault to ensure the event is sent before navigation.
- If hydration mismatches persist, add a small test in `StanzaShareClient` to serialize the server-rendered innerHTML for each stanza and compare to the client innerHTML to spot the exact fragment difference.

## Sharing snippet format (requirements)

- Snippets are groups of 4–5 lines, split by two consecutive <br> tags. Keep the line breaks in the shared text.
- Add a star emoji at the beginning and end of the snippet.
- After a blank line, append hashtags for all category tags after a colon, then the post URL and `via @tsongslyrics`.

Example shared text (Twitter):

⭐line one
line two
line three
line four⭐

: #Tag1 #Tag2 #Tag3
http://example.com/post-url via @tsongslyrics

## Completion

This document summarizes the current implementation, the likely root cause of the hydration errors, the stanza splitting + sanitization flow, the client-side share enhancer behavior, and next steps for debugging and hardening.

If you want, I can:

- Add a small automated assertion test that visits a known slug and compares server stanza HTML to client DOM at mount time.
- Implement a `sendBeacon` fallback inside `ShareEnhancer` and wire a safe `gtag` callback flow.

