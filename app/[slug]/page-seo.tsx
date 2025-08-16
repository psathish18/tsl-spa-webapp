import { Metadata } from 'next';
import Link from 'next/link';

interface Song {
  id: { $t: string };
  title: { $t: string };
  content: { $t: string };
  published: { $t: string };
  author: Array<{ name: { $t: string } }>;
  category?: Array<{ term: string }>;
  media$thumbnail?: { url: string };
  songTitle?: string;
  movieName?: string;
  singerName?: string;
  lyricistName?: string;
}

async function getSongData(slug: string): Promise<Song | null> {
  try {
    const cleanSlug = slug.replace('.html', '');

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/songs`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch songs');
    }

    const data = await response.json();
    const songs = data.feed?.entry || [];

    const matchingSong = songs.find((song: any) => {
      const songTitle = song.songTitle || song.title?.$t || '';
      const songSlug = songTitle.toLowerCase().replace(/[^a-z0-9\s-]/g, '');
      return songSlug === cleanSlug;
    });

    return matchingSong || null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export default getSongData;
