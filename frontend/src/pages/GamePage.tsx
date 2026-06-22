import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import AppConfirm, { type ConfirmState } from "../components/AppConfirm";
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, ExternalLink, Gamepad2, Moon, Pencil, Play, Plus, Search, Sun, Trash2, User, X } from "lucide-react";
import type { AuthUser } from "../App";
import type { EntryDraft, GameEntry } from "../types/library";
import EditEntryModal, { type GameInfo } from "../components/EditEntryModal";
import SearchOverlay from "../components/SearchOverlay";
import { API_BASE } from "../config";
import { useScrolled } from "../hooks/useScrolled";
import { GAME_STATUS_META } from "../lib/gameStatus";
import { findPlatform } from "../lib/platforms";
import { timeAgo } from "../lib/dateUtils";

type Page = "home" | "profile" | "user" | "login" | "game" | "calendar" | "games" | "admin";

type GameDetail = {
  rawgGameId: number;
  title: string | null;
  description: string | null;
  released: string | null;
  coverUrl: string | null;
  backgroundUrl: string | null;
  rawgRating: number | null;
  metacritic: number | null;
  genres: string[];
  platforms: string[];
  developers: string[];
  publishers: string[];
  website: string | null;
  playtime: number | null;
  esrbRating: string | null;
  screenshots: string[];
  trailerUrl: string | null;
  communityPlanning: number | null;
  communityPlaying: number | null;
  communityCompleted: number | null;
  communityDropped: number | null;
  achievements: { name: string; description: string | null; imageUrl: string | null; percent: string | null }[];
  dlcs: { rawgGameId: number; title: string; coverUrl: string | null; released: string | null }[];
};

type GamePageProps = {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onNavigate: (page: Page) => void;
  onGoBack: () => void;
  onViewUser: (username: string) => void;
  onViewGame: (rawgGameId: number) => void;
  onViewGames?: () => void;
  user: AuthUser | null;
  onLogout: () => void;
  rawgGameId: number;
  onRequestLogin?: (openEntry: boolean) => void;
  autoOpenEntry?: boolean;
  onAutoOpenConsumed?: () => void;
};


type MediaItem = { type: "image" | "trailer"; url: string };

type Review = {
  id: number;
  username: string;
  avatarUrl: string | null;
  title: string;
  body: string;
  score: number | null;
  containsSpoilers: boolean;
  publishedAt: string;
  own: boolean;
};

function renderStars(score: number | null): string {
  if (score === null) return "";
  const full = Math.round(score / 2);
  return "★".repeat(Math.min(full, 5)) + "☆".repeat(Math.max(0, 5 - full));
}


export default function GamePage({
  theme, onToggleTheme, onNavigate, onGoBack, onViewUser, onViewGame, onViewGames,
  user, onLogout, rawgGameId,
  onRequestLogin, autoOpenEntry, onAutoOpenConsumed,
}: GamePageProps) {
  const scrolled = useScrolled();
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [game,          setGame]          = useState<GameDetail | null>(null);
  const [gameLoading,   setGameLoading]   = useState(true);
  const [gameError,     setGameError]     = useState(false);
  const [entry,         setEntry]         = useState<GameEntry | null>(null);
  const [entryLoading,  setEntryLoading]  = useState(!!user?.token);
  const [addModalOpen,  setAddModalOpen]  = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [descExpanded,       setDescExpanded]       = useState(false);
  const [descOverflows,      setDescOverflows]      = useState(false);
  const [achievementsOpen,   setAchievementsOpen]   = useState(false);
  const [lightboxOpen,       setLightboxOpen]       = useState(false);
  const [lightboxIdx,        setLightboxIdx]        = useState(0);
  const [reviews,            setReviews]            = useState<Review[]>([]);
  const [reviewsTotal,       setReviewsTotal]       = useState(0);
  const [reviewsPage,        setReviewsPage]        = useState(0);
  const [reviewsHasMore,     setReviewsHasMore]     = useState(false);
  const [reviewsLoading,     setReviewsLoading]     = useState(false);
  const [myReview,           setMyReview]           = useState<Review | null>(null);
  const [rvTitle,            setRvTitle]            = useState("");
  const [rvBody,             setRvBody]             = useState("");
  const [rvSpoiler,          setRvSpoiler]          = useState(false);
  const [rvEditing,          setRvEditing]          = useState(false);
  const [rvSaving,           setRvSaving]           = useState(false);
  const [rvError,            setRvError]            = useState<string | null>(null);
  const [spoilerRevealed,    setSpoilerRevealed]    = useState<Set<number>>(new Set());
  const [bodyExpanded,       setBodyExpanded]       = useState<Set<number>>(new Set());
  const [confirm,            setConfirm]            = useState<ConfirmState | null>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (autoOpenEntry && user && !entryLoading) {
      if (entry) setEditModalOpen(true);
      else setAddModalOpen(true);
      onAutoOpenConsumed?.();
    }
  }, [autoOpenEntry, user, entryLoading, entry, onAutoOpenConsumed]);

  useEffect(() => {
    setGameLoading(true);
    setGameError(false);
    setGame(null);
    setDescExpanded(false);
    setLightboxOpen(false);
    fetch(`${API_BASE}/api/games/${rawgGameId}/detail`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: GameDetail) => setGame(d))
      .catch(() => setGameError(true))
      .finally(() => setGameLoading(false));
  }, [rawgGameId]);

  const loadEntry = useCallback(() => {
    if (!user?.token) { setEntry(null); return; }
    setEntryLoading(true);
    fetch(`${API_BASE}/api/me/games/by-rawg/${rawgGameId}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(r => r.ok ? r.json() : r.status === 404 ? null : Promise.reject(r.status))
      .then((data: GameEntry | null) => setEntry(data))
      .catch(() => setEntry(null))
      .finally(() => setEntryLoading(false));
  }, [rawgGameId, user?.token]);

  useEffect(() => { loadEntry(); }, [loadEntry]);

  useLayoutEffect(() => {
    setDescOverflows(false);
    if (!descRef.current) return;
    setDescOverflows(descRef.current.scrollHeight > descRef.current.clientHeight);
  }, [game?.description]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  const handleSaveEntry = async (draft: EntryDraft) => {
    if (!user?.token || !entry) return;
    const res = await fetch(`${API_BASE}/api/me/games/${entry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
      body: JSON.stringify({
        status: draft.status, score: draft.score, progressHours: draft.progressHours,
        platformNote: draft.platformNote, isFavorite: draft.isFavorite,
        notePrivate: draft.notePrivate, notePublic: draft.notePublic,
      }),
    });
    if (res.status === 401 || res.status === 403) { onLogout(); return; }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error((d as { message?: string }).message ?? "No se pudo guardar. Inténtalo de nuevo.");
    }
    setEditModalOpen(false);
    loadEntry();
  };

  const handleDeleteEntry = () => {
    if (!user?.token || !entry) return;
    setConfirm({
      message: "¿Quitar este juego de tu biblioteca?",
      confirmLabel: "Quitar",
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        const res = await fetch(`${API_BASE}/api/me/games/${entry.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (res.status === 401 || res.status === 403) { onLogout(); return; }
        if (res.ok) { setEntry(null); setEditModalOpen(false); }
      },
    });
  };

  const loadReviews = useCallback(async (page: number, append: boolean) => {
    setReviewsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (user?.token) headers.Authorization = `Bearer ${user.token}`;
      const res = await fetch(`${API_BASE}/api/games/${rawgGameId}/reviews?page=${page}&size=10`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      const content: Review[] = data.content ?? [];
      const mine = content.find(r => r.own) ?? null;
      if (mine) setMyReview(mine);
      const others = content.filter(r => !r.own);
      setReviews(prev => append ? [...prev, ...others] : others);
      setReviewsTotal(data.totalElements ?? 0);
      setReviewsHasMore(!data.last);
      setReviewsPage(page);
    } catch { /* silent */ } finally {
      setReviewsLoading(false);
    }
  }, [rawgGameId, user?.token]);

  useEffect(() => {
    setReviews([]);
    setMyReview(null);
    setRvTitle(""); setRvBody(""); setRvSpoiler(false); setRvError(null); setRvEditing(false);
    setSpoilerRevealed(new Set()); setBodyExpanded(new Set());
    loadReviews(0, false);
  }, [loadReviews]);


  const handleEditReview = () => {
    if (!myReview) return;
    setRvTitle(myReview.title);
    setRvBody(myReview.body);
    setRvSpoiler(myReview.containsSpoilers);
    setRvError(null);
    setRvEditing(true);
  };

  const handleSubmitReview = async () => {
    if (!user?.token) return;
    if (!rvTitle.trim() || !rvBody.trim()) { setRvError("El título y el texto son obligatorios"); return; }
    setRvSaving(true); setRvError(null);
    try {
      const res = await fetch(`${API_BASE}/api/me/games/${rawgGameId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ title: rvTitle.trim(), body: rvBody.trim(), score: entry?.score ?? null, containsSpoilers: rvSpoiler }),
      });
      if (res.status === 401 || res.status === 403) { onLogout(); return; }
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as {message?: string}).message ?? "No se pudo publicar la reseña. Inténtalo de nuevo."); }
      const saved: Review = await res.json();
      setMyReview(saved);
      setRvEditing(false);
      setRvTitle(""); setRvBody(""); setRvSpoiler(false);
      loadReviews(0, false);
    } catch (e) {
      setRvError(e instanceof Error ? e.message : "No se pudo publicar la reseña. Inténtalo de nuevo.");
    } finally { setRvSaving(false); }
  };

  const handleDeleteReview = () => {
    if (!user?.token || !myReview) return;
    setConfirm({
      message: "¿Eliminar tu reseña? Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        const res = await fetch(`${API_BASE}/api/me/games/${rawgGameId}/review`, {
          method: "DELETE", headers: { Authorization: `Bearer ${user.token}` },
        });
        if (res.status === 401 || res.status === 403) { onLogout(); return; }
        if (res.ok) {
          setMyReview(null); setRvTitle(""); setRvBody(""); setRvSpoiler(false); setRvEditing(false);
          loadReviews(0, false);
        }
      },
    });
  };

  const gameInfo: GameInfo | null = game ? {
    rawgGameId: game.rawgGameId,
    title:      game.title ?? "",
    coverUrl:   game.coverUrl,
    releasedAt: game.released,
    genres:     game.genres,
  } : null;

  const mediaItems: MediaItem[] = game ? [
    ...(game.trailerUrl ? [{ type: "trailer" as const, url: game.trailerUrl }] : []),
    ...game.screenshots.map(url => ({ type: "image" as const, url })),
  ] : [];

  const openLightbox = (idx: number) => { setLightboxIdx(idx); setLightboxOpen(true); };
  const lbPrev = (e: React.MouseEvent) => { e.stopPropagation(); setLightboxIdx(i => (i - 1 + mediaItems.length) % mediaItems.length); };
  const lbNext = (e: React.MouseEvent) => { e.stopPropagation(); setLightboxIdx(i => (i + 1) % mediaItems.length); };

  const renderPlatforms = () => {
    const seen = new Set<string>();
    return game!.platforms.flatMap(p => {
      const meta = findPlatform(p);
      const key = meta ? meta.key : p;
      if (seen.has(key)) return [];
      seen.add(key);
      return meta ? (
        <span key={key} className="gp-platform-chip"
          style={{ borderColor: meta.color, color: meta.color, background: `color-mix(in srgb, ${meta.color} 14%, transparent)` }}>
          <span className="platform-chip-icon" style={{ color: meta.color }}>{meta.icon}</span>
          {meta.label}
        </span>
      ) : (
        <span key={key} className="gp-platform-chip">{p}</span>
      );
    });
  };

  return (
    <>
    <div className="page-wrapper game-page">

      {searchOpen && (
        <SearchOverlay
          onClose={() => setSearchOpen(false)}
          onViewUser={onViewUser}
          onViewGame={onViewGame}
          token={user?.token}
          onLoginRequested={() => onNavigate("login")}
          onSessionExpired={onLogout}
        />
      )}

      {addModalOpen && gameInfo && user?.token && (
        <EditEntryModal
          mode="add"
          game={gameInfo}
          token={user.token}
          onAdded={() => { setAddModalOpen(false); loadEntry(); }}
          onClose={() => setAddModalOpen(false)}
          onSessionExpired={onLogout}
        />
      )}

      {editModalOpen && entry && (
        <EditEntryModal
          entry={entry}
          onSave={handleSaveEntry}
          onDelete={handleDeleteEntry}
          onClose={() => setEditModalOpen(false)}
        />
      )}

      {lightboxOpen && mediaItems.length > 0 && (
        <div className="gp-lightbox" onClick={() => setLightboxOpen(false)}>
          <button className="gp-lb-close" onClick={() => setLightboxOpen(false)}>
            <X size={18} />
          </button>
          {mediaItems.length > 1 && (
            <>
              <button className="gp-lb-nav gp-lb-nav--prev" onClick={lbPrev}>
                <ChevronLeft size={24} />
              </button>
              <button className="gp-lb-nav gp-lb-nav--next" onClick={lbNext}>
                <ChevronRight size={24} />
              </button>
            </>
          )}
          <div className="gp-lb-content" onClick={e => e.stopPropagation()}>
            {mediaItems[lightboxIdx].type === "trailer"
              ? <video className="gp-lb-video" controls autoPlay src={mediaItems[lightboxIdx].url} />
              : <img className="gp-lb-img" src={mediaItems[lightboxIdx].url} alt="" />}
          </div>
          <span className="gp-lb-counter">{lightboxIdx + 1} / {mediaItems.length}</span>
        </div>
      )}

      <nav className={`navbar${scrolled ? " is-floating" : ""}`}>
        <div className="navbar-inner">
          <button className="nav-icon-btn" onClick={onGoBack} title="Atrás">
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <a className="nav-brand" onClick={() => onNavigate("home")} style={{ cursor: "pointer" }}>
            <img src={`/media/logo-${theme === "dark" ? "oscuro" : "claro"}.png`} alt="GameDeck" className="brand-logo-img" />
            GameDeck
          </a>
          <div className="nav-spacer" />
          <div className="nav-actions">
            <button className="nav-icon-btn" title="Juegos" onClick={onViewGames}><Gamepad2 size={22} strokeWidth={2} /></button>
            <button className="nav-icon-btn" title="Calendario" onClick={() => onNavigate("calendar")}><Calendar size={20} strokeWidth={2} /></button>
            {user ? (
              <button className="nav-avatar-btn" title={user.username} onClick={() => onNavigate("profile")}>
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt={user.username} className="nav-avatar-img" />
                  : user.username.slice(0, 2).toUpperCase()}
              </button>
            ) : (
              <button className="nav-icon-btn" title="Iniciar sesión" onClick={() => onNavigate("login")}>
                <User size={20} strokeWidth={2} />
              </button>
            )}
            <button className="nav-theme-btn" onClick={onToggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
            </button>
            <button className="btn-search-pill" onClick={() => setSearchOpen(true)} title="Buscar">
              <Search size={19} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </nav>

      <div className="gp-header">
        <div
          className="gp-header-backdrop"
          style={{ backgroundImage: game ? `url(${game.backgroundUrl ?? game.coverUrl ?? ""})` : undefined }}
        />
        <div className="gp-header-overlay" />
        <div className="container gp-header-inner">
          <div className="gp-header-cover-space" />
          {gameLoading && (
            <div className="gp-header-text">
              <div className="gp-sk gp-sk-title" />
              <div className="gp-sk gp-sk-sub" />
            </div>
          )}
          {game && (
            <div className="gp-header-text">
              <h1 className="gp-title">{game.title}</h1>
              <p className="gp-sub">
                {[game.released?.slice(0, 4), game.genres.slice(0, 3).join(", ")].filter(Boolean).join(" · ")}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="container gp-layout">

        <aside className="gp-sidebar">
          {gameLoading && (
            <>
              <div className="gp-sidebar-cover">
                <div className="gp-sk gp-sk-cover" />
              </div>
              <div className="gp-scores">
                <div className="gp-sk gp-sk-score-chip" />
                <div className="gp-sk gp-sk-score-chip" />
                <div className="gp-sk gp-sk-score-chip" />
              </div>
            </>
          )}

          {game?.coverUrl && (
            <div className="gp-sidebar-cover">
              <img src={game.coverUrl} alt={game.title ?? ""} />
            </div>
          )}

          {game && (
            <>
              {((game.rawgRating != null && game.rawgRating > 0) || game.metacritic != null || (game.playtime != null && game.playtime > 0)) && (
                <div className="gp-scores">
                  {game.rawgRating != null && game.rawgRating > 0 && (
                    <div className="gp-score-chip">
                      <span className="gp-score-lbl">RAWG</span>
                      <span className="gp-score-val">⭐ {(game.rawgRating * 2).toFixed(1)}</span>
                    </div>
                  )}
                  {game.metacritic != null && (
                    <div className={`gp-score-chip gp-metacritic${game.metacritic >= 75 ? " is-good" : game.metacritic >= 50 ? " is-ok" : " is-bad"}`}>
                      <span className="gp-score-lbl">Metacritic</span>
                      <span className="gp-score-val">{game.metacritic}</span>
                    </div>
                  )}
                  {game.playtime != null && game.playtime > 0 && (
                    <div className="gp-score-chip">
                      <span className="gp-score-lbl">Duración</span>
                      <span className="gp-score-val">~{game.playtime}h</span>
                    </div>
                  )}
                </div>
              )}

              <div className="gp-library">
                {!user && (
                  <button className="gp-add-btn" onClick={() => onRequestLogin ? onRequestLogin(true) : onNavigate("login")}>
                    <Plus size={16} /> Añadir a mi biblioteca
                  </button>
                )}
                {user && entryLoading && <div className="gp-sk gp-sk-entry" />}
                {user && !entryLoading && !entry && (
                  <button className="gp-add-btn" onClick={() => setAddModalOpen(true)}>
                    <Plus size={16} /> Añadir a mi biblioteca
                  </button>
                )}
                {user && !entryLoading && entry && (() => {
                  const plat = findPlatform(entry.platformNote);
                  return (
                    <div className="gp-entry-card glass" onClick={() => setEditModalOpen(true)}>
                      {user.avatarUrl
                        ? <img src={user.avatarUrl} alt={user.username} className="gp-entry-avatar" />
                        : <div className="gp-entry-avatar gp-entry-avatar--initials">{user.username.slice(0, 2).toUpperCase()}</div>
                      }
                      <div className="gp-entry-details">
                        <span className="gp-entry-details-label">Puntuación</span>
                        <span className="gp-entry-score">{entry.score !== null ? entry.score.toFixed(1) : "–"}</span>
                        <span className="gp-entry-status" style={{ color: GAME_STATUS_META[entry.status].color }}>
                          {GAME_STATUS_META[entry.status].emoji} {GAME_STATUS_META[entry.status].label}
                        </span>
                        {entry.progressHours !== null && entry.progressHours > 0 && (
                          <span className="gp-entry-hours">{entry.progressHours}h jugadas</span>
                        )}
                        {plat ? (
                          <span className="gp-entry-platform-chip" style={{ color: plat.color, borderColor: `color-mix(in srgb, ${plat.color} 50%, transparent)`, background: `color-mix(in srgb, ${plat.color} 14%, transparent)` }}>
                            <span style={{ color: plat.color, display: "flex" }}>{plat.icon}</span>
                            {plat.label}
                          </span>
                        ) : entry.platformNote ? (
                          <span className="gp-entry-platform">{entry.platformNote}</span>
                        ) : null}
                      </div>
                      <div className="gp-entry-hover-edit">Editar</div>
                    </div>
                  );
                })()}
              </div>

              {game.platforms.length > 0 && (
                <div className="gp-sidebar-block">
                  <h3 className="gp-sidebar-label">Plataformas</h3>
                  <div className="gp-platforms">{renderPlatforms()}</div>
                </div>
              )}

              <div className="gp-misc">
                {game.developers.length > 0 && (
                  <div className="gp-misc-item">
                    <strong>Desarrollador</strong>
                    <span>{game.developers.join(", ")}</span>
                  </div>
                )}
                {game.publishers.length > 0 && (
                  <div className="gp-misc-item">
                    <strong>Publisher</strong>
                    <span>{game.publishers.join(", ")}</span>
                  </div>
                )}
                {game.esrbRating && (
                  <div className="gp-misc-item">
                    <strong>ESRB</strong>
                    <span>{game.esrbRating}</span>
                  </div>
                )}
                {game.website && (
                  <div className="gp-misc-item">
                    <a href={game.website} target="_blank" rel="noopener noreferrer" className="gp-website-link">
                      <ExternalLink size={13} /> Sitio web oficial
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>

        <div className="gp-body">
          {gameLoading && (
            <div className="gp-sk-body">
              <div className="gp-section">
                <div className="gp-sk gp-sk-section-title" />
                <div className="gp-sk gp-sk-line" />
                <div className="gp-sk gp-sk-line" />
                <div className="gp-sk gp-sk-line" />
                <div className="gp-sk gp-sk-line gp-sk-line--75" />
                <div className="gp-sk gp-sk-line gp-sk-line--50" />
              </div>
              <div className="gp-section">
                <div className="gp-sk gp-sk-section-title" />
                <div className="gp-community-bar">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="gp-sk gp-sk-stat-chip" />)}
                </div>
              </div>
              <div className="gp-section">
                <div className="gp-sk gp-sk-section-title" />
                <div className="gp-media-strip">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="gp-sk gp-sk-media-thumb" />)}
                </div>
              </div>
            </div>
          )}
          {gameError   && <p className="gp-status gp-status--error">No se pudo cargar la información del juego.</p>}

          {game && (
            <>
              {game.description && game.description.trim().length > 0 && (
                <div className="gp-section">
                  <h2 className="gp-section-title">Descripción</h2>
                  <p ref={descRef} className={`gp-description${descExpanded ? "" : " is-collapsed"}`}>
                    {game.description}
                  </p>
                  {descOverflows && (
                    <button className="gp-expand-btn" onClick={() => setDescExpanded(e => !e)}>
                      {descExpanded ? "Leer menos ↑" : "Leer más ↓"}
                    </button>
                  )}
                </div>
              )}

              {(game.communityPlanning != null || game.communityPlaying != null ||
                game.communityCompleted != null || game.communityDropped != null) && (
                <div className="gp-section">
                  <h2 className="gp-section-title">Comunidad</h2>
                  <div className="gp-community-bar">
                    {([
                      { label: "Pendientes",  value: game.communityPlanning,  color: "var(--text-secondary)" },
                      { label: "Jugando",     value: game.communityPlaying,   color: "var(--accent)" },
                      { label: "Completados", value: game.communityCompleted, color: "#22c55e" },
                      { label: "Abandonados", value: game.communityDropped,   color: "#ef4444" },
                    ] as const).filter(s => s.value != null).map(s => (
                      <div key={s.label} className="profile-stat-chip glass"
                        style={{ ["--chip-color" as never]: s.color } as React.CSSProperties}>
                        <span className="profile-stat-num">{s.value!.toLocaleString("es-ES")}</span>
                        <span className="profile-stat-label">{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mediaItems.length > 0 && (
                <div className="gp-section">
                  <h2 className="gp-section-title">Media</h2>
                  <div className="gp-media-strip">
                    {mediaItems.map((item, i) => (
                      <button key={i} className="gp-media-thumb" onClick={() => openLightbox(i)} aria-label={item.type === "trailer" ? "Ver tráiler" : `Captura ${i}`}>
                        {item.type === "trailer" ? (
                          <div className="gp-media-trailer">
                            {game.backgroundUrl || game.coverUrl
                              ? <img src={game.backgroundUrl ?? game.coverUrl ?? ""} alt="Tráiler" />
                              : <div className="gp-media-trailer-bg" />}
                            <div className="gp-media-play-overlay">
                              <Play size={28} fill="currentColor" />
                              <span>Tráiler</span>
                            </div>
                          </div>
                        ) : (
                          <img src={item.url} alt={`Captura ${i}`} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {game.dlcs.length > 0 && (
                <div className="gp-section">
                  <h2 className="gp-section-title">DLC</h2>
                  <div className="gp-dlc-grid">
                    {game.dlcs.map(dlc => (
                      <div key={dlc.rawgGameId} className="gp-dlc-card is-navigable" onClick={() => onViewGame(dlc.rawgGameId)}>
                        <div className="gp-dlc-cover">
                          {dlc.coverUrl ? <img src={dlc.coverUrl} alt={dlc.title} /> : <span className="gp-dlc-placeholder">🎮</span>}
                        </div>
                        <div className="gp-dlc-info">
                          <p className="gp-dlc-title">{dlc.title}</p>
                          {dlc.released && <p className="gp-dlc-year">{dlc.released.slice(0, 4)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {game.achievements.length > 0 && (
                <div className="gp-section">
                  <button className="gp-section-toggle" onClick={() => setAchievementsOpen(o => !o)}>
                    <h2 className="gp-section-title">Logros <span className="gp-section-count">({game.achievements.length})</span></h2>
                    <span className="gp-section-chevron">{achievementsOpen ? "↑" : "↓"}</span>
                  </button>
                  {achievementsOpen && (
                    <div className="gp-achievements">
                      {game.achievements.map(a => (
                        <div key={a.name} className="gp-achievement">
                          <div className="gp-achievement-icon">
                            {a.imageUrl ? <img src={a.imageUrl} alt={a.name} /> : <span>🏆</span>}
                          </div>
                          <div className="gp-achievement-info">
                            <p className="gp-achievement-name">{a.name}</p>
                            {a.description && <p className="gp-achievement-desc">{a.description}</p>}
                          </div>
                          {a.percent && <span className="gp-achievement-pct">{a.percent}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="gp-section">
                <h2 className="gp-section-title">
                  Reseñas {reviewsTotal > 0 && <span className="gp-section-count">({reviewsTotal})</span>}
                </h2>

                {user && myReview && !rvEditing && (() => {
                  const revealed = spoilerRevealed.has(myReview.id);
                  const expanded = bodyExpanded.has(myReview.id);
                  const longBody = myReview.body.length > 200 || myReview.body.split('\n').length > 3;
                  return (
                    <div className="gp-review-card glass gp-review-card--own">
                      <div className="gp-review-card-header">
                        <div className="gp-review-card-author">
                          {user.avatarUrl
                            ? <img src={user.avatarUrl} alt={user.username} className="gp-review-avatar" />
                            : <div className="gp-review-avatar gp-review-avatar--initials">{user.username.slice(0, 2).toUpperCase()}</div>}
                          <div>
                            <span className="gp-review-card-username">
                              {user.username} <span className="gp-review-own-badge">Tu reseña</span>
                            </span>
                            <span className="gp-review-card-date">{timeAgo(myReview.publishedAt)}</span>
                          </div>
                        </div>
                        <div className="gp-review-card-right">
                          {myReview.score !== null && (
                            <div className="gp-review-card-score">
                              <span className="gp-review-stars">{renderStars(myReview.score)}</span>
                              <span className="gp-review-score-val">{myReview.score.toFixed(1)}</span>
                            </div>
                          )}
                          <button className="gp-review-icon-btn" onClick={handleEditReview} title="Editar reseña">
                            <Pencil size={15} />
                          </button>
                          <button className="gp-review-icon-btn gp-review-icon-btn--danger" onClick={handleDeleteReview} title="Eliminar reseña">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      <p className="gp-review-card-title">{myReview.title}</p>
                      {myReview.containsSpoilers && !revealed ? (
                        <div className="gp-review-spoiler-block">
                          <span>⚠ Contiene spoilers</span>
                          <button onClick={() => setSpoilerRevealed(s => new Set([...s, myReview.id]))}>Ver igualmente</button>
                        </div>
                      ) : (
                        <>
                          <p className={`gp-review-card-body${expanded ? "" : " is-collapsed"}`}>{myReview.body}</p>
                          {longBody && (
                            <button className="gp-review-expand-btn" onClick={() =>
                              setBodyExpanded(s => { const n = new Set(s); n.has(myReview.id) ? n.delete(myReview.id) : n.add(myReview.id); return n; })}>
                              {expanded ? "Leer menos ↑" : "Leer más ↓"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}

                {user && ((entry && !myReview) || rvEditing) && (
                  <div className="gp-review-form glass">
                    <div className="gp-review-form-author">
                      {user.avatarUrl
                        ? <img src={user.avatarUrl} alt={user.username} className="gp-review-avatar" />
                        : <div className="gp-review-avatar gp-review-avatar--initials">{user.username.slice(0, 2).toUpperCase()}</div>}
                      <span className="gp-review-form-username">{user.username}</span>
                      {rvEditing && <span className="gp-review-own-badge">Editando</span>}
                    </div>
                    <input className="gp-review-title-input" type="text"
                      placeholder="Título de tu reseña" maxLength={150}
                      value={rvTitle} onChange={e => setRvTitle(e.target.value)} />
                    <textarea className="gp-review-body-input"
                      placeholder="Cuéntanos tu experiencia con este juego..." maxLength={10000} rows={5}
                      value={rvBody} onChange={e => setRvBody(e.target.value)} />
                    <div className="gp-review-form-footer">
                      <label className="gp-review-spoiler-label">
                        <input type="checkbox" checked={rvSpoiler} onChange={e => setRvSpoiler(e.target.checked)} />
                        Contiene spoilers
                      </label>
                      <div className="gp-review-form-actions">
                        {rvEditing && (
                          <button className="gp-review-cancel-btn" onClick={() => { setRvEditing(false); setRvError(null); }}>
                            Cancelar
                          </button>
                        )}
                        <button className="gp-review-submit-btn" onClick={handleSubmitReview}
                          disabled={rvSaving || !rvTitle.trim() || !rvBody.trim()}>
                          {rvSaving ? "Guardando…" : rvEditing ? "Actualizar reseña" : "Publicar reseña"}
                        </button>
                      </div>
                    </div>
                    {rvError && <p className="gp-review-error">{rvError}</p>}
                  </div>
                )}

                {!user && (
                  <div className="gp-review-auth-prompt glass">
                    <button className="gp-review-login-btn" onClick={() => onRequestLogin ? onRequestLogin(false) : onNavigate("login")}>Inicia sesión</button>
                    <span>para escribir una reseña</span>
                  </div>
                )}

                {user && !entry && !entryLoading && !myReview && (
                  <p className="gp-review-hint">Añade el juego a tu biblioteca para poder reseñarlo.</p>
                )}

                {reviews.length > 0 && (
                  <div className="gp-reviews-list">
                    {reviews.map(r => {
                      const revealed = spoilerRevealed.has(r.id);
                      const expanded = bodyExpanded.has(r.id);
                      const longBody = r.body.length > 200 || r.body.split('\n').length > 3;
                      return (
                        <div key={r.id} className="gp-review-card glass">
                          <div className="gp-review-card-header">
                            <div className="gp-review-card-author">
                              <button className="gp-review-author-btn" onClick={() => onViewUser(r.username)}>
                                {r.avatarUrl
                                  ? <img src={r.avatarUrl} alt={r.username} className="gp-review-avatar" />
                                  : <div className="gp-review-avatar gp-review-avatar--initials">{r.username.slice(0, 2).toUpperCase()}</div>}
                                <div>
                                  <span className="gp-review-card-username">{r.username}</span>
                                  <span className="gp-review-card-date">{timeAgo(r.publishedAt)}</span>
                                </div>
                              </button>
                            </div>
                            {r.score !== null && (
                              <div className="gp-review-card-score">
                                <span className="gp-review-stars">{renderStars(r.score)}</span>
                                <span className="gp-review-score-val">{r.score.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          <p className="gp-review-card-title">{r.title}</p>
                          {r.containsSpoilers && !revealed ? (
                            <div className="gp-review-spoiler-block">
                              <span>⚠ Contiene spoilers</span>
                              <button onClick={() => setSpoilerRevealed(s => new Set([...s, r.id]))}>Ver igualmente</button>
                            </div>
                          ) : (
                            <>
                              <p className={`gp-review-card-body${expanded ? "" : " is-collapsed"}`}>{r.body}</p>
                              {longBody && (
                                <button className="gp-review-expand-btn" onClick={() =>
                                  setBodyExpanded(s => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })}>
                                  {expanded ? "Leer menos ↑" : "Leer más ↓"}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {reviewsHasMore && (
                  <button className="gp-review-load-more" disabled={reviewsLoading}
                    onClick={() => loadReviews(reviewsPage + 1, true)}>
                    {reviewsLoading ? "Cargando…" : "Cargar más reseñas"}
                  </button>
                )}
              </div>

            </>
          )}
        </div>
      </div>
    </div>

    {confirm && (
      <AppConfirm
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        danger={confirm.danger}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(null)}
      />
    )}
    </>
  );
}
