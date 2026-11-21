
import {
  setAudioModeAsync,
  useAudioPlayer,
} from "expo-audio";
import { useCallback, useEffect } from "react";

type SoundType = "xp" | "level" | "rank";

export function useHunterSounds() {
  const xpPlayer = useAudioPlayer(
    require("../app/assets/sounds/xp.mp3")
  );

  const levelPlayer = useAudioPlayer(
    require("../app/assets/sounds/levelup.mp3")
  );

  const rankPlayer = useAudioPlayer(
    require("../app/assets/sounds/rankup.mp3")
  );

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
    }).catch(() => {});
  }, []);

  return useCallback(async (type: SoundType) => {
    try {
      const player =
        type === "xp" ? xpPlayer :
        type === "level" ? levelPlayer : rankPlayer;

      await player.seekTo(0);
      player.play();
    } catch (error) {
      console.log("Erreur lecture son", error);
    }
  }, [xpPlayer, levelPlayer, rankPlayer]);
}
