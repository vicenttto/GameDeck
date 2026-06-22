import type { GameStatus } from "../lib/gameStatus";

export type GameEntry = {
  id: number;
  status: GameStatus;
  score: number | null;
  progressHours: number | null;
  platformNote: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  isFavorite: boolean;
  /** Solo visible al dueño. */
  notePrivate: string | null;
  /** Visible a cualquier visitante. */
  notePublic: string | null;
  updatedAt: string;
  gameId: number;
  rawgGameId: number;
  title: string;
  coverUrl: string | null;
  releasedAt: string | null;
  genres: string[];
  platforms: string[];
  rawgRating: number | null;
  metacritic: number | null;
};

export type EntryDraft = {
  status: GameStatus;
  score: number | null;
  progressHours: number | null;
  platformNote: string | null;
  isFavorite: boolean;
  /** Cadena vacía significa "borrar la nota". */
  notePrivate: string;
  notePublic: string;
};
