
type SoundType = "xp" | "level" | "rank";

export function useHunterSounds(): (
  type: SoundType
) => void | Promise<void>;
