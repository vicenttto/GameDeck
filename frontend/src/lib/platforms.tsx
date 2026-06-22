import { Gamepad2, Monitor, Smartphone } from "lucide-react";
import type { ReactNode } from "react";

export type PlatformKey =
  | "PC"
  | "PLAYSTATION"
  | "XBOX"
  | "NINTENDO"
  | "STEAM_DECK"
  | "MOBILE";

export type PlatformMeta = {
  key: PlatformKey;
  label: string;       // Etiqueta visible
  short: string;       // Texto canónico guardado en BD (platform_note)
  color: string;       // Acento del chip
  icon: ReactNode;
};

const ICON_SIZE = 14;

export const PLATFORMS: PlatformMeta[] = [
  { key: "PC",          label: "PC",          short: "PC",          color: "#7d7e80",
    icon: <Monitor size={ICON_SIZE} /> },
  { key: "PLAYSTATION", label: "PlayStation", short: "PlayStation", color: "#0070d1",
    icon: <Gamepad2 size={ICON_SIZE} /> },
  { key: "XBOX",        label: "Xbox",        short: "Xbox",        color: "#107c10",
    icon: <Gamepad2 size={ICON_SIZE} /> },
  { key: "NINTENDO",    label: "Nintendo",    short: "Nintendo",    color: "#e60012",
    icon: <Gamepad2 size={ICON_SIZE} /> },
  { key: "STEAM_DECK",  label: "Steam Deck",  short: "Steam Deck",  color: "#1b6dad",
    icon: <Monitor size={ICON_SIZE} /> },
  { key: "MOBILE",      label: "Móvil",       short: "Móvil",       color: "#6b7280",
    icon: <Smartphone size={ICON_SIZE} /> },
];

/**
 * Resuelve el `platform_note` guardado a una de las plataformas conocidas.
 * Hace match permisivo para que datos antiguos ("PS5", "Switch", "Xbox One"…)
 * sigan mapeando a la familia correcta sin migración de datos.
 */
export function findPlatform(short: string | null | undefined): PlatformMeta | null {
  if (!short) return null;
  const s = short.trim().toLowerCase();
  if (!s) return null;

  const exact = PLATFORMS.find(p => p.short.toLowerCase() === s);
  if (exact) return exact;

  if (/(^|[^a-z])ps\d|playstation|sony/.test(s))         return PLATFORMS.find(p => p.key === "PLAYSTATION") ?? null;
  if (/xbox|series\s*[xs]|xbone/.test(s))                 return PLATFORMS.find(p => p.key === "XBOX") ?? null;
  if (/nintendo|switch|wii\s*u|3ds/.test(s))              return PLATFORMS.find(p => p.key === "NINTENDO") ?? null;
  if (/steam\s*deck/.test(s))                             return PLATFORMS.find(p => p.key === "STEAM_DECK") ?? null;
  if (/m[oó]vil|mobile|android|ios|iphone|ipad/.test(s))  return PLATFORMS.find(p => p.key === "MOBILE") ?? null;
  if (/^pc$|windows|linux|mac/.test(s))                   return PLATFORMS.find(p => p.key === "PC") ?? null;

  return null;
}
