import { getMoodTags, getMoodTagStyle } from '@/lib/songContentUtils';

interface MoodTagsProps {
  title: string;
  singerName?: string;
  musicName?: string;
}

/**
 * Displays inferred mood/emotion pill tags for the current song.
 * Renders nothing if no moods could be detected.
 */
export default function MoodTags({ title, singerName, musicName }: MoodTagsProps) {
  const moods = getMoodTags(title, singerName, musicName);

  if (moods.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3" aria-label="Song mood tags">
      {moods.map(mood => {
        const { bg, text } = getMoodTagStyle(mood);
        return (
          <span
            key={mood}
            className={`mood-tag ${bg} ${text} text-xs font-semibold px-3 py-1 rounded-full`}
            title={`This song has a ${mood} mood`}
          >
            {mood}
          </span>
        );
      })}
    </div>
  );
}
