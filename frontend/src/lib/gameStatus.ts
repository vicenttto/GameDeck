// Estados canónicos que maneja el backend (constraint CHECK de user_game_entries.status).
export type GameStatus =
  | "PLAN_TO_PLAY"
  | "PLAYING"
  | "COMPLETED"
  | "ON_HOLD"
  | "DROPPED"
  | "REPLAYING";

export type GameStatusMeta = {
  label: string;   // Texto en español
  emoji: string;   // Emoji para timeline/cards
  color: string;   // Color para badges
};

export const GAME_STATUS_META: Record<GameStatus, GameStatusMeta> = {
  PLAYING:      { label: "Jugando",     emoji: "🎮", color: "var(--accent)" },
  COMPLETED:    { label: "Completado",  emoji: "🏁", color: "#22c55e" },
  ON_HOLD:      { label: "En pausa",    emoji: "⏸",  color: "#f59e0b" },
  DROPPED:      { label: "Abandonado",  emoji: "❌", color: "#ef4444" },
  REPLAYING:    { label: "Rejugando",   emoji: "🔄", color: "#8b5cf6" },
  PLAN_TO_PLAY: { label: "Pendiente",   emoji: "📋", color: "var(--text-secondary)" },
};

export const GAME_STATUS_ORDER: GameStatus[] = [
  "PLAN_TO_PLAY",
  "PLAYING",
  "COMPLETED",
  "REPLAYING",
  "ON_HOLD",
  "DROPPED",
];

export const statusLabel = (s: GameStatus) => GAME_STATUS_META[s].label;
export const statusEmoji = (s: GameStatus) => GAME_STATUS_META[s].emoji;
export const statusColor = (s: GameStatus) => GAME_STATUS_META[s].color;
