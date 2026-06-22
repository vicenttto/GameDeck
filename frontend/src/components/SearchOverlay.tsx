import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Plus, Search, X } from "lucide-react";
import type { GameSummary } from "../types";
import { API_BASE } from "../config";
import EditEntryModal, { type GameInfo } from "./EditEntryModal";
import AppConfirm from "./AppConfirm";

type Props = {
  onClose: () => void;
  onViewUser: (username: string) => void;
  onViewGame?: (rawgGameId: number) => void;
  token?: string;
  currentUsername?: string | null;
  onLoginRequested?: (rawgGameId?: number) => void;
  onGameAdded?: (rawgGameId: number) => void;
  onSessionExpired?: () => void;
  onFollowChanged?: () => void;
};

type SearchTab = "games" | "users";

type UserResult = {
  username: string;
  avatarUrl: string | null;
  countryCode: string | null;
  followersCount: number;
  isFollowing: boolean | null;
};

type SpringPage<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

function SearchEmptyIllustration() {
  return (
    <svg width="110" height="110" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="52" cy="52" r="38" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <line x1="80" y1="80" x2="104" y2="104" stroke="currentColor" strokeOpacity="0.2" strokeWidth="5" strokeLinecap="round" />
      <rect x="30" y="44" width="44" height="28" rx="10" fill="currentColor" fillOpacity="0.15" />
      <rect x="36" y="56" width="3" height="8" rx="1" fill="currentColor" fillOpacity="0.3" />
      <rect x="33" y="59" width="9" height="3" rx="1" fill="currentColor" fillOpacity="0.3" />
      <circle cx="60" cy="53" r="2.5" fill="currentColor" fillOpacity="0.3" />
      <circle cx="66" cy="58" r="2.5" fill="currentColor" fillOpacity="0.3" />
      <circle cx="60" cy="63" r="2.5" fill="currentColor" fillOpacity="0.3" />
      <circle cx="54" cy="58" r="2.5" fill="currentColor" fillOpacity="0.3" />
      <text x="16" y="24" fontSize="11" fill="currentColor" fillOpacity="0.22">✦</text>
      <text x="83" y="30" fontSize="7" fill="currentColor" fillOpacity="0.22">✦</text>
      <text x="24" y="90" fontSize="6" fill="currentColor" fillOpacity="0.22">✦</text>
    </svg>
  );
}

type AddState = "idle" | "added";

export default function SearchOverlay({ onClose, onViewUser, onViewGame, token, currentUsername, onLoginRequested, onGameAdded, onSessionExpired, onFollowChanged }: Props) {
  const [query,       setQuery]       = useState("");
  const [activeTab,   setActiveTab]   = useState<SearchTab>("games");
  const [gameResults, setGameResults] = useState<GameSummary[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [addState,    setAddState]    = useState<Record<number, AddState>>({});
  const [addModalGame, setAddModalGame] = useState<GameInfo | null>(null);
  const [followState,  setFollowState]  = useState<Record<string, boolean | null>>({});
  const [unfollowConfirm, setUnfollowConfirm] = useState<string | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef    = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/me/games/rawg-ids`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then((ids: number[] | null) => {
        if (!Array.isArray(ids)) return;
        const alreadyAdded: Record<number, AddState> = {};
        for (const id of ids) {
          alreadyAdded[id] = "added";
        }
        setAddState(alreadyAdded);
      })
      .catch(() => {});
  }, [token]);

  const handleAddClick = (game: GameSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) {
      onLoginRequested?.(game.externalId ?? undefined);
      onClose();
      return;
    }
    if (game.externalId == null) return;
    setAddModalGame({
      rawgGameId: game.externalId,
      title:      game.title ?? "",
      coverUrl:   game.coverUrl,
      releasedAt: game.released,
      genres:     game.genres ?? [],
    });
  };

  const handleFollow = async (username: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/users/${username}/follow`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setFollowState(prev => ({ ...prev, [username]: true }));
      onFollowChanged?.();
    }
  };

  const handleUnfollow = async (username: string) => {
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/users/${username}/follow`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setFollowState(prev => ({ ...prev, [username]: false }));
      setUnfollowConfirm(null);
      onFollowChanged?.();
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !addModalGame && !unfollowConfirm) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, addModalGame, unfollowConfirm]);

  useEffect(() => {
    clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setGameResults([]);
      setUserResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      try {
        if (activeTab === "games") {
          const url = `${API_BASE}/api/games/search?query=${encodeURIComponent(trimmed)}&page=1&size=10`;
          const response = await fetch(url, { signal: abortRef.current.signal });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json() as GameSummary[];
          setGameResults(Array.isArray(data) ? data : []);
        } else {
          const url = `${API_BASE}/api/users/search?query=${encodeURIComponent(trimmed)}&page=0&size=10`;
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;
          const response = await fetch(url, { signal: abortRef.current.signal, headers });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json() as SpringPage<UserResult>;
          const users = Array.isArray(data.content) ? data.content : [];
          setUserResults(users);
          setFollowState(prev => {
            const next = { ...prev };
            users.forEach(u => { if (!(u.username in next)) next[u.username] = u.isFollowing; });
            return next;
          });
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setGameResults([]);
        setUserResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query, activeTab, token]);

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
    setGameResults([]);
    setUserResults([]);
  };

  const trimmedQuery  = query.trim();
  const activeResults = activeTab === "games" ? gameResults : userResults;
  const showEmpty     = !loading && (!trimmedQuery || activeResults.length === 0);

  return (
    <>
      <div
        className="search-overlay-backdrop"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="search-overlay-panel" role="dialog" aria-modal aria-label="Search">

          <div className="search-overlay-bar">
            <button
              className="search-back-btn"
              onClick={onClose}
              aria-label="Close search"
            >
              <ArrowLeft size={18} strokeWidth={2} />
            </button>

            <div className="search-input-wrap">
              <input
                ref={inputRef}
                className="search-overlay-input"
                type="text"
                placeholder={activeTab === "games" ? "Buscar juegos..." : "Buscar usuarios..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={activeTab === "games" ? "Buscar juegos" : "Buscar usuarios"}
              />
              {query && (
                <button
                  className="search-clear-btn"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                >
                  <X size={11} strokeWidth={3} />
                </button>
              )}
              <span className="search-input-icon">
                <Search size={15} strokeWidth={2} />
              </span>
            </div>
          </div>

          <div className="search-tabs">
            <button
              className={`search-tab${activeTab === "games" ? " active" : ""}`}
              onClick={() => handleTabChange("games")}
            >
              Juegos
            </button>
            <button
              className={`search-tab${activeTab === "users" ? " active" : ""}`}
              onClick={() => handleTabChange("users")}
            >
              Usuarios
            </button>
          </div>

          {trimmedQuery && (
            <p className="search-results-label">
              {loading ? "Buscando…" : `Resultados para "${trimmedQuery}"`}
            </p>
          )}

          {showEmpty && (
            <div className="search-empty">
              <SearchEmptyIllustration />
            </div>
          )}

          {!showEmpty && activeTab === "games" && (
            <ul className="search-results-list">
              {gameResults.map((game, i) => {
                const year   = game.released ? game.released.slice(0, 4) : null;
                const genres = game.genres?.join(", ") ?? null;
                const state  = game.externalId != null ? addState[game.externalId] ?? "idle" : "idle";

                return (
                  <li key={game.externalId ?? i} className="search-result-row">
                    <div
                      className={`search-result-clickable${onViewGame && game.externalId != null ? " is-navigable" : ""}`}
                      onClick={() => {
                        if (onViewGame && game.externalId != null) { onViewGame(game.externalId); onClose(); }
                      }}
                    >
                      <div className="search-result-thumb">
                        {game.coverUrl
                          ? <img src={game.coverUrl} alt={game.title ?? ""} />
                          : <span>🎮</span>
                        }
                      </div>

                      <div className="search-result-info">
                        <p className="search-result-title">{game.title ?? "Unknown title"}</p>
                        {genres && <p className="search-result-genres">{genres}</p>}
                        {year   && <p className="search-result-meta">{year}</p>}
                      </div>
                    </div>

                    <button
                      className={`search-result-add state-${state}`}
                      aria-label={`Añadir ${game.title ?? "juego"} a tu biblioteca`}
                      title={
                        state === "added" ? "Añadido a tu biblioteca"
                        : !token ? "Inicia sesión para añadir"
                        : "Añadir a mi biblioteca"
                      }
                      disabled={state === "added"}
                      onClick={(e) => { e.stopPropagation(); handleAddClick(game, e); }}
                    >
                      {state === "added"
                        ? <Check size={14} strokeWidth={3} />
                        : <Plus size={14} strokeWidth={3} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!showEmpty && activeTab === "users" && (
            <ul className="search-results-list">
              {userResults.map((u) => {
                const initials = u.username.slice(0, 2).toUpperCase();
                const isSelf = currentUsername === u.username;
                const isFollowing = followState[u.username] ?? u.isFollowing;
                return (
                  <li
                    key={u.username}
                    className="search-user-row"
                    onClick={() => { onViewUser(u.username); onClose(); }}
                  >
                    <div className="search-user-avatar">
                      {u.avatarUrl
                        ? <img src={u.avatarUrl} alt={u.username} />
                        : initials}
                    </div>
                    <div className="search-user-info">
                      <p className="search-user-name">@{u.username}</p>
                      <p className="search-user-meta">
                        {u.countryCode ? `${u.countryCode} · ` : ""}
                        {u.followersCount} {u.followersCount === 1 ? "seguidor" : "seguidores"}
                      </p>
                    </div>
                    {token && !isSelf && (
                      <button
                        className={`follow-btn-inline${isFollowing ? " is-following" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          isFollowing
                            ? setUnfollowConfirm(u.username)
                            : handleFollow(u.username, e);
                        }}
                      >
                        {isFollowing ? "Siguiendo" : "Seguir"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

        </div>
      </div>

      {addModalGame && token && (
        <EditEntryModal
          mode="add"
          game={addModalGame}
          token={token}
          onAdded={() => {
            setAddState(prev => ({ ...prev, [addModalGame.rawgGameId]: "added" }));
            onGameAdded?.(addModalGame.rawgGameId);
            setAddModalGame(null);
          }}
          onClose={() => setAddModalGame(null)}
          onSessionExpired={() => { onSessionExpired?.(); onClose(); }}
        />
      )}

      {unfollowConfirm && (
        <AppConfirm
          message={`¿Dejar de seguir a @${unfollowConfirm}?`}
          confirmLabel="Dejar de seguir"
          danger
          onConfirm={() => handleUnfollow(unfollowConfirm)}
          onCancel={() => setUnfollowConfirm(null)}
        />
      )}
    </>
  );
}
