
import { useCallback } from "react";

type SoundType = "xp" | "level" | "rank";

const sounds = {
  xp: require("../app/assets/sounds/xp.mp3"),
  level: require("../app/assets/sounds/levelup.mp3"),
  rank: require("../app/assets/sounds/rankup.mp3"),
};

export function useHunterSounds() {
  return useCallback((type: SoundType) => {
    try {
      if (typeof Audio === "undefined") return;

      const audio = new Audio(sounds[type]);
      audio.play().catch(error => {
        console.log("Erreur lecture son", error);
      });
    } catch (error) {
      console.log("Erreur lecture son", error);
    }
  }, []);
}
