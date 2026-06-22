import type { GameSummary } from "../types";

type Props = {
  game: GameSummary;
};

export default function GameCard({ game }: Props) {
  return (
    <article className="game-card">
      <img
        className="game-cover"
        src={game.coverUrl ?? "https://placehold.co/320x180?text=No+Cover"}
        alt={game.title ?? "Game cover"}
      />
      <div className="game-content">
        <h3>{game.title ?? "Sin titulo"}</h3>
        <p>Lanzamiento: {game.released ?? "N/A"}</p>
        <p>Rating RAWG: {game.rawgRating ?? "N/A"}</p>
      </div>
    </article>
  );
}
