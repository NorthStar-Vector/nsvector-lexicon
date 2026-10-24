import type { Screen } from "./types";

const SCREENS: readonly Screen[] = ["home", "catch", "bank", "cards", "quiz"];

export function screenFromHash(hash: string): Screen {
  const raw = hash.replace(/^#\/?/, "").split("?")[0]?.trim().toLowerCase() ?? "";
  if ((SCREENS as readonly string[]).includes(raw)) return raw as Screen;
  return "home";
}

export function hashForScreen(screen: Screen): string {
  return screen === "home" ? "#/" : `#/${screen}`;
}
