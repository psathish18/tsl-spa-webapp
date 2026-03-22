import lyricistBiosRaw from './data/lyricists-mini-bios.json';

export interface LyricistTopSong {
  title: string;
  htmlPageUrl: string;
}

export interface LyricistBio {
  name: string;
  description: string;
  topSongs: LyricistTopSong[];
}

function isValidTopSong(song: unknown): song is LyricistTopSong {
  if (!song || typeof song !== 'object') return false;
  const item = song as { title?: unknown; htmlPageUrl?: unknown };
  return typeof item.title === 'string' && item.title.trim().length > 0
    && typeof item.htmlPageUrl === 'string' && item.htmlPageUrl.trim().length > 0;
}

function isValidLyricistBio(item: unknown): item is LyricistBio {
  if (!item || typeof item !== 'object') return false;

  const bio = item as {
    name?: unknown;
    description?: unknown;
    topSongs?: unknown;
  };

  return typeof bio.name === 'string'
    && bio.name.trim().length > 0
    && typeof bio.description === 'string'
    && bio.description.trim().length > 0
    && Array.isArray(bio.topSongs);
}

const lyricistBioCache: LyricistBio[] = (Array.isArray(lyricistBiosRaw) ? lyricistBiosRaw : [])
  .filter(isValidLyricistBio)
  .map((bio) => ({
    name: bio.name.trim(),
    description: bio.description.trim(),
    topSongs: Array.isArray(bio.topSongs) ? bio.topSongs.filter(isValidTopSong).slice(0, 10) : [],
  }));

const lyricistBioLookupCache: Map<string, LyricistBio> = (() => {
  const lookup = new Map<string, LyricistBio>();

  for (const bio of lyricistBioCache) {
    // Phase 1: direct mapping (no canonical normalization).
    const key = bio.name.trim();
    if (!lookup.has(key)) {
      lookup.set(key, bio);
    }
  }

  return lookup;
})();

export async function getLyricistBioByName(lyricistName: string): Promise<LyricistBio | null> {
  if (!lyricistName || !lyricistName.trim()) return null;

  return lyricistBioLookupCache.get(lyricistName.trim()) || null;
}
