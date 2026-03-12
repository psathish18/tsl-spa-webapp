import { getMoodTags } from '@/lib/songContentUtils';

interface MoodTagsProps {
  title: string;
  singerName?: string;
  musicName?: string;
  tags?: string[]; // Optional array of additional tags that might help infer moods
}

/**
 * Displays inferred mood/emotion pill tags for the current song.
 * Renders nothing if no moods could be detected.
 * Automatically adapts to the active theme (blue, green, orange, purple, dark, indigo).
 */
export default function MoodTags({ title, singerName, musicName, tags }: MoodTagsProps) {
  // const moods = getMoodTags(title, singerName, musicName);
  const moods = tags?.length ? tags.map(tag => tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase()) : getMoodTags(title, singerName, musicName); // Use provided tags if available, otherwise infer from title/singer/music
  if (moods.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-3" aria-label="Song mood tags">
      <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Song Mood:</span>
      {moods.map(mood => (
        <span
          key={mood}
          className="mood-tag text-xs font-semibold px-3 py-1 rounded-full cursor-default"
          title={`This song has a ${mood} mood`}
        >
          {mood}
        </span>
      ))}
    </div>
  );
}
