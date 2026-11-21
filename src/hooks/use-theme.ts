/**
 * Hook to access the current app color palette.
 * If the platform has not resolved a color scheme yet, use light mode.
 */
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? "dark" : "light";

  return Colors[theme];
}
