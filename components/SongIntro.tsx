import type { EnrichedMetadata } from '@/scripts/types/song-blob.types'

interface SongIntroProps {
  intro: string // HTML content from high_ctr_intro
  enrichedMetadata?: EnrichedMetadata
}

/**
 * Displays the song introduction with enriched metadata (mood, type, occasions).
 * Theme-aware and SEO-optimized component.
 */
export default function SongIntro({ intro, enrichedMetadata }: SongIntroProps) {
  if (!intro) return null

  const hasMood = enrichedMetadata?.mood && enrichedMetadata.mood.length > 0
  const hasSongType = enrichedMetadata?.songType && enrichedMetadata.songType.length > 0
  const hasOccasions = enrichedMetadata?.occasions && enrichedMetadata.occasions.length > 0
  const hasMetadata = hasMood || hasSongType || hasOccasions
  return (
    <div className="song-intro-section mb-6 rounded-lg border" style={{ 
      backgroundColor: 'var(--card)', 
      borderColor: 'var(--card-border)' 
    }}>
      {/* Intro paragraph */}
      <div 
        className="intro-text p-2 prose prose-lg max-w-none"
        style={{ color: 'var(--text)' }}
        dangerouslySetInnerHTML={{ __html: intro }}
      />
      
      {/* Metadata badges */}
      {hasMetadata && (
        <div className="px-2 pb-2 pt-0">
          <div className="flex flex-wrap gap-3">
            {/* Mood tags */}
            {hasMood && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  Mood:
                </span>
                {enrichedMetadata.mood.filter((value)=> value!="devotional").map((mood, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                    style={{
                      backgroundColor: 'var(--pill-bg)',
                      color: 'var(--pill-text)',
                      borderColor: 'var(--mood-border)',
                    }}
                    title={`Mood: ${mood}`}
                  >
                    {mood}
                  </span>
                ))}
              </div>
            )}

            {/* Song type tags */}
            {hasSongType && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  Type:
                </span>
                {enrichedMetadata.songType.map((type, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                    style={{
                      backgroundColor: 'var(--pill-bg)',
                      color: 'var(--pill-text)',
                      borderColor: 'var(--mood-border)',
                    }}
                    title={`Song type: ${type}`}
                  >
                    {type}
                  </span>
                ))}
              </div>
            )}

            {/* Occasions tags */}
            {hasOccasions && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  Perfect for:
                </span>
                {enrichedMetadata.occasions.map((occasion, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                    style={{
                      backgroundColor: 'var(--pill-bg)',
                      color: 'var(--pill-text)',
                      borderColor: 'var(--mood-border)',
                    }}
                    title={`Perfect for: ${occasion}`}
                  >
                    {occasion}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
