export type GameSummary = {
  externalId: number | null;
  title: string | null;
  released: string | null;
  coverUrl: string | null;
  rawgRating: number | null;
  genres: string[] | null;
  added?: number | null;
  metacritic?: number | null;
  ratingsCount?: number | null;
  hot?: boolean | null;
  platforms?: string[] | null;
  developers?: string[] | null;
};
