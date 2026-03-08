/**
 * Song content utility functions for lyrics page enrichment features:
 * - Mood/emotion tag detection (#3)
 * - Stanza label auto-generation (#6)
 * - Auto-generated FAQ generation (#11)
 */

// ─── #6: Stanza Labels ───────────────────────────────────────────────────────

/**
 * Returns the stanza label for a given position.
 * Tamil song structure: Pallavi → Anupallavi → Charanam 1, 2, 3 …
 */
export function getStanzaLabel(index: number, total: number): string {
  if (total === 1) return 'Pallavi';
  if (total === 2) {
    return index === 0 ? 'Pallavi' : 'Charanam';
  }
  // 3+ stanzas
  if (index === 0) return 'Pallavi';
  if (index === 1) return 'Anupallavi';
  return `Charanam ${index - 1}`;
}

// ─── #3: Mood Tags ───────────────────────────────────────────────────────────

type MoodTag = 'Romantic' | 'Sad' | 'Devotional' | 'Peppy / Dance' | 'Motivational' | 'Melody' | 'Folk' | 'Lullaby';

interface MoodRule {
  mood: MoodTag;
  keywords: string[];
}

const MOOD_RULES: MoodRule[] = [
  {
    mood: 'Devotional',
    keywords: [
      'murugan', 'muruga', 'siva', 'shiva', 'amman', 'amma', 'devi', 'pillaiyar',
      'kandhan', 'kandha', 'thiruviz', 'bhakti', 'suprabatham', 'thiruppugazh',
      'saraswathi', 'lakshmi', 'vinayagar', 'ganapathi', 'ayyappa', 'venkateswara',
      'hanuman', 'devotional', 'stotram', 'potri', 'thevaram'
    ],
  },
  {
    mood: 'Lullaby',
    keywords: ['thalattu', 'thaalatu', 'lullaby', 'ninai', 'thaala', 'thala thala', 'thalattal'],
  },
  {
    mood: 'Peppy / Dance',
    keywords: [
      'kuthu', 'kuththu', 'dance', 'party', 'whistle', 'mass', 'intro', 'theme',
      'celebration', 'festival', 'pongal', 'remix', 'beat', 'groove', 'disco',
      'jumpy', 'jumbu', 'vaadi', 'neeye neeye', 'stereo'
    ],
  },
  {
    mood: 'Sad',
    keywords: [
      'sad', 'pain', 'viraham', 'tholaindha', 'tholainthen', 'netriyil', 'kanneer',
      'kaandhal', 'yaarum', 'vilagindrai', 'ninaivugal', 'kasindha', 'unmai',
      'pirivom', 'pirivu', 'maranam', 'izhantha', 'ponaval', 'broken',
      'nenjile', 'nenjil oru', 'tears'
    ],
  },
  {
    mood: 'Motivational',
    keywords: [
      'vaazhga', 'vaazha', 'winner', 'rise', 'power', 'strength', 'thozha',
      'nanbane', 'nanbaa', 'veera', 'veeran', 'yodha', 'kodungal', 'un peyar',
      'vandhaye', 'fighter', 'hero', 'mass', 'winning', 'glory'
    ],
  },
  {
    mood: 'Folk',
    keywords: [
      'nattu', 'folk', 'naattupura', 'naattu', 'oyilam', 'kummi', 'therukoothu',
      'karakattam', 'kolattam', 'villu', 'villupattu', 'oppari'
    ],
  },
  {
    mood: 'Romantic',
    keywords: [
      'kaadhal', 'kadhal', 'love', 'snehame', 'idhayam', 'ullam', 'manasae',
      'maname', 'romance', 'romantic', 'en jeevan', 'un mela', 'nee irundha',
      'ennai konjam', 'konjam', 'kangal', 'kannil', 'poongatru', 'malargale',
      'roja', 'thendral', 'mazhai', 'megham', 'nilave'
    ],
  },
  {
    mood: 'Melody',
    keywords: [
      'melody', 'soft', 'classical', 'carnatic', 'raagam', 'raga', 'isai',
      'paadal', 'geetham', 'kavithai', 'kuyil', 'poove', 'vaanam',
      'neeye', 'innum', 'nenjodu', 'mudhal', 'ival'
    ],
  },
];

/**
 * Derive mood tags from song title, singer name, and music director.
 * Returns up to 2 mood tags (most specific match first).
 */
export function getMoodTags(
  title: string,
  singerName?: string,
  musicName?: string
): MoodTag[] {
  const lowerTitle = (title || '').toLowerCase();
  const lowerSinger = (singerName || '').toLowerCase();
  const lowerMusic = (musicName || '').toLowerCase();
  const combined = `${lowerTitle} ${lowerSinger} ${lowerMusic}`;

  const matched: MoodTag[] = [];

  for (const rule of MOOD_RULES) {
    if (matched.length >= 2) break;
    const hit = rule.keywords.some(kw => combined.includes(kw));
    if (hit && !matched.includes(rule.mood)) {
      matched.push(rule.mood);
    }
  }

  return matched;
}

/** Tailwind color classes per mood tag */
export function getMoodTagStyle(mood: MoodTag): { bg: string; text: string } {
  const styles: Record<MoodTag, { bg: string; text: string }> = {
    Romantic:        { bg: 'bg-pink-100',   text: 'text-pink-800' },
    Sad:             { bg: 'bg-blue-100',   text: 'text-blue-800' },
    Devotional:      { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    'Peppy / Dance': { bg: 'bg-orange-100', text: 'text-orange-800' },
    Motivational:    { bg: 'bg-green-100',  text: 'text-green-800' },
    Melody:          { bg: 'bg-purple-100', text: 'text-purple-800' },
    Folk:            { bg: 'bg-amber-100',  text: 'text-amber-800' },
    Lullaby:         { bg: 'bg-teal-100',   text: 'text-teal-800' },
  };
  return styles[mood] ?? { bg: 'bg-gray-100', text: 'text-gray-700' };
}

// ─── #11: Auto-generated FAQ ─────────────────────────────────────────────────

export interface FAQItem {
  question: string;
  answer: string;
}

export interface AutoFAQParams {
  songName: string;
  movieName?: string;
  singerName?: string;
  lyricistName?: string;
  musicName?: string;
  actorName?: string;
  hasTamilLyrics?: boolean;
  hasEnglishLyrics?: boolean;
}

/**
 * Generate FAQ items from song metadata.
 * Only questions with available data are included.
 * Always appends a "where to find lyrics" question that adds unique editorial value.
 */
export function generateAutoFAQ(params: AutoFAQParams): FAQItem[] {
  const {
    songName,
    movieName,
    singerName,
    lyricistName,
    musicName,
    actorName,
    hasTamilLyrics,
    hasEnglishLyrics,
  } = params;

  const faqs: FAQItem[] = [];
  const cleanSong = songName?.trim() || 'this song';

  if (movieName) {
    faqs.push({
      question: `Which movie is "${cleanSong}" from?`,
      answer: `"${cleanSong}" is from the Tamil movie "${movieName}".`,
    });
  }

  if (singerName && singerName !== 'Unknown Artist') {
    faqs.push({
      question: `Who sang "${cleanSong}"?`,
      answer: `"${cleanSong}" was sung by ${singerName}.`,
    });
  }

  if (lyricistName) {
    faqs.push({
      question: `Who wrote the lyrics of "${cleanSong}"?`,
      answer: `The lyrics of "${cleanSong}" were penned by ${lyricistName}.`,
    });
  }

  if (musicName) {
    faqs.push({
      question: `Who composed the music for "${cleanSong}"?`,
      answer: `The music for "${cleanSong}" was composed by ${musicName}.`,
    });
  }

  if (actorName) {
    faqs.push({
      question: `Which actor features in the song "${cleanSong}"?`,
      answer: `${actorName} features in the song "${cleanSong}"${movieName ? ` from ${movieName}` : ''}.`,
    });
  }

  // "Where to find" – always present, adds unique content
  const formatList = [
    'Tanglish (Tamil written in English letters)',
    ...(hasTamilLyrics ? ['Tamil script'] : []),
    ...(hasEnglishLyrics ? ['English meaning'] : []),
  ].join(', ');

  faqs.push({
    question: `Where can I find the complete lyrics of "${cleanSong}"?`,
    answer: `You can read the full lyrics of "${cleanSong}" on this page in ${formatList}. Each stanza has a share button so you can instantly send your favourite lines to friends via Twitter or WhatsApp.`,
  });

  return faqs;
}
