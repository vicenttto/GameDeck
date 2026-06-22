import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "../components/Avatar";
import AppConfirm, { type ConfirmState } from "../components/AppConfirm";
import { ArrowLeft, Calendar, ChevronDown, Gamepad2, Globe, Lock, Moon, Pencil, Plus, Search, Sun, User, Star, Heart, BookOpen, List, Activity, Trash2, X } from "lucide-react";
import SearchOverlay from "../components/SearchOverlay";
import FollowListModal, { type FollowTab } from "../components/FollowListModal";
import EditEntryModal from "../components/EditEntryModal";
import type { EntryDraft, GameEntry } from "../types/library";
import type { AuthUser } from "../App";
import { API_BASE } from "../config";
import { useScrolled } from "../hooks/useScrolled";
import { GAME_STATUS_META, GAME_STATUS_ORDER, type GameStatus } from "../lib/gameStatus";
import { findPlatform } from "../lib/platforms";
import { timeAgo, formatJoinedDate, formatReviewDate } from "../lib/dateUtils";
import "flag-icons/css/flag-icons.min.css";

type Page = "home" | "profile" | "user" | "login" | "game" | "calendar" | "games" | "admin";

type ProfilePageProps = {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onNavigate: (page: Page) => void;
  onGoBack: () => void;
  refreshKey?: number;
  user: AuthUser | null;
  onLogout: () => void;
  onUserUpdate: (updated: AuthUser) => void;
  viewingUsername?: string | null;
  onViewUser?: (username: string) => void;
  onViewGame?: (rawgGameId: number) => void;
  onViewGames?: () => void;
};

type ProfileData = {
  username: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  countryCode: string | null;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean | null;
  admin: boolean;
};

const AVAILABLE_AVATARS = [
  { id: "mario",        src: "/avatars/char-mario.svg",        label: "Mario" },
  { id: "link",         src: "/avatars/char-link.svg",         label: "Link" },
  { id: "hollow",       src: "/avatars/char-hollow-knight.svg", label: "Hollow Knight" },
  { id: "pikachu",      src: "/avatars/char-pikachu.svg",      label: "Pikachu" },
  { id: "pokeball",     src: "/avatars/char-pokeball.svg",     label: "Pokéball" },
  { id: "kirby",        src: "/avatars/char-kirby.svg",        label: "Kirby" },
  { id: "creeper",      src: "/avatars/char-creeper.svg",      label: "Creeper" },
  { id: "among-us",     src: "/avatars/char-among-us.svg",     label: "Among Us" },
  { id: "master-chief", src: "/avatars/char-master-chief.svg", label: "Master Chief" },
  { id: "pac-man",      src: "/avatars/char-pac-man.svg",      label: "Pac-Man" },
  { id: "samus",        src: "/avatars/char-samus.svg",        label: "Samus" },
  { id: "teemo",        src: "/avatars/char-teemo.svg",        label: "Teemo" },
];

const COUNTRIES = [
  { code: "DE", name: "Alemania" },
  { code: "SA", name: "Arabia Saudita" },
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Bélgica" },
  { code: "BR", name: "Brasil" },
  { code: "CA", name: "Canadá" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "KR", name: "Corea del Sur" },
  { code: "HR", name: "Croacia" },
  { code: "DK", name: "Dinamarca" },
  { code: "ES", name: "España" },
  { code: "US", name: "Estados Unidos" },
  { code: "FI", name: "Finlandia" },
  { code: "FR", name: "Francia" },
  { code: "GR", name: "Grecia" },
  { code: "HU", name: "Hungría" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Irlanda" },
  { code: "IT", name: "Italia" },
  { code: "JP", name: "Japón" },
  { code: "MX", name: "México" },
  { code: "NO", name: "Noruega" },
  { code: "NZ", name: "Nueva Zelanda" },
  { code: "NL", name: "Países Bajos" },
  { code: "PE", name: "Perú" },
  { code: "PL", name: "Polonia" },
  { code: "PT", name: "Portugal" },
  { code: "GB", name: "Reino Unido" },
  { code: "CZ", name: "República Checa" },
  { code: "RO", name: "Rumanía" },
  { code: "RU", name: "Rusia" },
  { code: "ZA", name: "Sudáfrica" },
  { code: "SE", name: "Suecia" },
  { code: "CH", name: "Suiza" },
  { code: "TR", name: "Turquía" },
  { code: "UA", name: "Ucrania" },
  { code: "UY", name: "Uruguay" },
  { code: "VE", name: "Venezuela" },
];

function CountryFlag({ code }: { code: string }) {
  return <span className={`fi fi-${code.toLowerCase()}`} style={{ borderRadius: "2px" }} />;
}

type EntryStatus = GameStatus;

type LibraryStats = {
  total: number;
  playing: number;
  completed: number;
  replaying: number;
  onHold: number;
  dropped: number;
  planToPlay: number;
  meanScore: number | null;
  totalHours: number;
};

type SpringPage<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

type UserReview = {
  id: number;
  rawgGameId: number | null;
  gameTitle: string;
  gameCoverUrl: string | null;
  title: string;
  body: string;
  score: number | null;
  containsSpoilers: boolean;
  publishedAt: string;
};

type ListItem = {
  id: number;
  rawgGameId: number;
  title: string;
  coverUrl: string | null;
  releasedAt: string | null;
  genres: string[];
  note: string | null;
  position: number | null;
};

type UserList = {
  id: number;
  name: string;
  description: string | null;
  isPublic: boolean;
  gameCount: number;
  covers: string[];
  items: ListItem[];
};

type ActivityEventType = "ENTRY_STATUS_CHANGED" | "REVIEW_PUBLISHED" | "LIST_CREATED" | "FOLLOWED_USER" | "SCORE_UPDATED" | "GAME_FAVORITED";

type ActivityEvent = {
  id: number;
  targetAvatarUrl?: string | null;
  eventType:      ActivityEventType;
  gameTitle:      string | null;
  gameCoverUrl:   string | null;
  newStatus:      string | null;
  score:          number | null;
  listName:       string | null;
  targetUsername: string | null;
  createdAt:      string;
};

const STATUS_LABEL = Object.fromEntries(
  GAME_STATUS_ORDER.map(s => [s, GAME_STATUS_META[s].label]),
) as Record<EntryStatus, string>;

const STATUS_COLOR = Object.fromEntries(
  GAME_STATUS_ORDER.map(s => [s, GAME_STATUS_META[s].color]),
) as Record<EntryStatus, string>;

type ProfileTab = "library" | "reviews" | "lists" | "activity";
type LibraryFilter = "ALL" | EntryStatus;

function GameEntryRow({
  entry,
  editable,
  onNavigate,
  onEdit,
  onDelete,
}: {
  entry: GameEntry;
  editable: boolean;
  onNavigate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const year = entry.releasedAt?.slice(0, 4) ?? null;
  const genresText = entry.genres.length > 0 ? entry.genres.join(", ") : null;
  const meta = [genresText, year].filter(Boolean).join(" · ");
  const platform = findPlatform(entry.platformNote);
  const hasNotePrivate = !!entry.notePrivate?.trim();
  const hasNotePublic  = !!entry.notePublic?.trim();

  return (
    <div
      className={`profile-entry-row${onNavigate ? " is-clickable" : ""}`}
      onClick={onNavigate}
      role={onNavigate ? "button" : undefined}
      tabIndex={onNavigate ? 0 : undefined}
    >
      <div className="profile-entry-main">
        <div className="profile-entry-cover">
          {entry.coverUrl
            ? <img src={entry.coverUrl} alt={entry.title} />
            : <div className="profile-entry-cover-fallback">🎮</div>}
          {entry.isFavorite && <span className="profile-entry-fav" title="Favorito">♥</span>}
        </div>
        <div className="profile-entry-info">
          <p className="profile-entry-title">{entry.title}</p>
          {meta && <p className="profile-entry-meta">{meta}</p>}
        </div>
        <span
          className="profile-entry-status"
          style={{ color: STATUS_COLOR[entry.status] }}
        >
          {STATUS_LABEL[entry.status]}
        </span>
        <span className="profile-entry-score">
          {entry.score !== null ? entry.score.toFixed(1) : "—"}
        </span>
        <span className="profile-entry-hours">
          {entry.progressHours !== null && entry.progressHours > 0 ? `${entry.progressHours}h` : "—"}
        </span>
        {platform ? (
          <span
            className="profile-entry-platform has-icon"
            style={{ color: platform.color, borderColor: `${platform.color}55` }}
            title={platform.label}
          >
            {platform.icon} {platform.short}
          </span>
        ) : entry.platformNote ? (
          <span className="profile-entry-platform">{entry.platformNote}</span>
        ) : (
          <span className="profile-entry-platform is-empty">—</span>
        )}
        {editable && onEdit && (
          <button
            className="profile-entry-edit"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            title="Editar entrada"
            aria-label="Editar entrada"
          >
            <Pencil size={14} />
          </button>
        )}
        {editable && onDelete && (
          <button
            className="profile-entry-delete"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Eliminar de la biblioteca"
            aria-label="Eliminar de la biblioteca"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {hasNotePrivate && (
        <div className="profile-entry-notes">
          <span className="profile-entry-notes-badge is-private" title="Sólo tú la ves">
            <Lock size={11} />
          </span>
          <p className="profile-entry-notes-text">{entry.notePrivate}</p>
        </div>
      )}
      {hasNotePublic && (
        <div className="profile-entry-notes">
          <span className="profile-entry-notes-badge" title="Nota pública">
            <Globe size={11} />
          </span>
          <p className="profile-entry-notes-text">{entry.notePublic}</p>
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review, onViewGame, onDelete, onSaved, token }: {
  review: UserReview;
  onViewGame?: (id: number) => void;
  onDelete?: () => void;
  onSaved?: (updated: UserReview) => void;
  token?: string;
}) {
  const [editing,  setEditing]  = useState(false);
  const [rvTitle,  setRvTitle]  = useState(review.title);
  const [rvBody,   setRvBody]   = useState(review.body);
  const [rvSpoiler,setRvSpoiler]= useState(review.containsSpoilers);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const clickable = review.rawgGameId != null && onViewGame != null;

  const openEdit = () => {
    setRvTitle(review.title);
    setRvBody(review.body);
    setRvSpoiler(review.containsSpoilers);
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!rvTitle.trim() || !rvBody.trim()) { setError("El título y el texto son obligatorios."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/me/games/${review.rawgGameId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: rvTitle.trim(), body: rvBody.trim(), score: review.score ?? null, containsSpoilers: rvSpoiler }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as { message?: string }).message ?? "No se pudo guardar."); }
      const saved = await res.json();
      onSaved?.({ ...review, title: saved.title, body: saved.body, containsSpoilers: saved.containsSpoilers });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally { setSaving(false); }
  };

  return (
    <article className="profile-review-card glass">
      <div
        className={`profile-review-cover-wrap${clickable ? " is-clickable" : ""}`}
        onClick={clickable ? () => onViewGame!(review.rawgGameId!) : undefined}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
      >
        {review.gameCoverUrl
          ? <img className="profile-review-cover" src={review.gameCoverUrl} alt={review.gameTitle} />
          : <div className="profile-review-cover profile-review-cover--fallback">🎮</div>}
      </div>
      <div className="profile-review-body">
        <div className="profile-review-header">
          <div>
            <p
              className={`profile-review-game${clickable ? " is-clickable" : ""}`}
              onClick={clickable ? () => onViewGame!(review.rawgGameId!) : undefined}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
            >
              {review.gameTitle}
            </p>
            {!editing && <h3 className="profile-review-title">{review.title}</h3>}
          </div>
          <div className="profile-review-header-right">
            {review.score != null && (
              <span className="profile-review-score">{Number(review.score).toFixed(1)}</span>
            )}
            {onSaved && !editing && (
              <button className="profile-list-action-btn is-edit" onClick={openEdit} title="Editar reseña">
                <Pencil size={13} />
              </button>
            )}
            {onDelete && !editing && (
              <button className="profile-list-action-btn is-danger" onClick={onDelete} title="Eliminar reseña">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {editing ? (
          <div className="profile-review-edit-form">
            <input
              className="profile-review-edit-input"
              value={rvTitle}
              onChange={e => setRvTitle(e.target.value)}
              placeholder="Título"
              disabled={saving}
            />
            <textarea
              className="profile-review-edit-textarea"
              value={rvBody}
              onChange={e => setRvBody(e.target.value)}
              placeholder="Texto de la reseña…"
              rows={4}
              disabled={saving}
            />
            <label className="profile-review-edit-spoiler">
              <input type="checkbox" checked={rvSpoiler} onChange={e => setRvSpoiler(e.target.checked)} disabled={saving} />
              Contiene spoilers
            </label>
            {error && <p className="profile-review-edit-error">{error}</p>}
            <div className="profile-review-edit-actions">
              <button className="edit-cancel-btn" onClick={() => setEditing(false)} disabled={saving}>Cancelar</button>
              <button className="edit-save-btn" onClick={handleSave} disabled={saving}>
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="profile-review-excerpt">{review.body}</p>
            <div className="profile-review-footer">
              <span className="profile-review-date">{formatReviewDate(review.publishedAt)}</span>
              {review.containsSpoilers && <span className="profile-review-spoiler">Spoilers</span>}
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function ListCard({
  list,
  editable,
  token,
  onEdit,
  onDelete,
  onItemChanged,
  onSessionExpired,
  onViewGame,
}: {
  list: UserList;
  editable: boolean;
  token?: string;
  onEdit: () => void;
  onDelete: () => void;
  onItemChanged: (updated: UserList) => void;
  onSessionExpired: () => void;
  onViewGame?: (rawgGameId: number) => void;
}) {
  const [expanded,       setExpanded]       = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [searchResults,  setSearchResults]  = useState<Array<{ externalId: number | null; title: string | null; coverUrl: string | null }>>([]);
  const [searchLoading,  setSearchLoading]  = useState(false);
  const [confirm,        setConfirm]        = useState<ConfirmState | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchResults.length) return;
    const handler = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSearchResults([]);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchResults.length]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const r = await fetch(`${API_BASE}/api/games/search?query=${encodeURIComponent(searchQuery)}&page=1&size=6`);
        if (r.ok) setSearchResults(await r.json());
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleAddGame = async (externalId: number) => {
    if (!token) return;
    const r = await fetch(`${API_BASE}/api/me/lists/${list.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rawgGameId: externalId }),
    });
    if (r.status === 401 || r.status === 403) { onSessionExpired(); return; }
    if (r.ok) {
      onItemChanged(await r.json());
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const handleRemoveGame = (rawgGameId: number) => {
    if (!token) return;
    setConfirm({
      message: "¿Eliminar este juego de la lista?",
      confirmLabel: "Eliminar",
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        const r = await fetch(`${API_BASE}/api/me/lists/${list.id}/items/${rawgGameId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.status === 401 || r.status === 403) { onSessionExpired(); return; }
        if (r.ok) {
          const remaining = list.items.filter(i => i.rawgGameId !== rawgGameId);
          const covers = remaining
            .map(i => i.coverUrl)
            .filter((c): c is string => !!c)
            .slice(0, 2);
          onItemChanged({ ...list, items: remaining, gameCount: list.gameCount - 1, covers });
        }
      },
    });
  };

  return (
    <article className="profile-list-card glass">
      <div
        className={`profile-list-header-row${expanded ? " is-expanded" : ""}`}
        onClick={() => setExpanded(e => !e)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === "Enter" && setExpanded(v => !v)}
      >
        <div className="profile-list-covers-wrap">
          {list.covers.length === 0 && (
            <div className="profile-list-cover-placeholder"><List size={22} /></div>
          )}
          {list.covers.length === 1 && (
            <img className="profile-list-cover-single" src={list.covers[0]} alt="" />
          )}
          {list.covers.length >= 2 && (
            <div className="profile-list-cover-double">
              <img src={list.covers[0]} alt="" />
              <img src={list.covers[1]} alt="" />
            </div>
          )}
        </div>

        <div className="profile-list-meta">
          <div className="profile-list-name-row">
            <h3 className="profile-list-name">{list.name}</h3>
            {list.isPublic
              ? <span className="profile-entry-notes-badge" title="Lista pública"><Globe size={11} /></span>
              : <span className="profile-entry-notes-badge is-private" title="Lista privada"><Lock size={11} /></span>}
          </div>
          {list.description && <p className="profile-list-desc">{list.description}</p>}
          <p className="profile-list-count">{list.gameCount} {list.gameCount === 1 ? "juego" : "juegos"}</p>
        </div>

        <div className="profile-list-actions">
          {editable && (
            <>
              <button
                className="profile-list-action-btn is-edit"
                onClick={e => { e.stopPropagation(); onEdit(); }}
                title="Editar lista"
              >
                <Pencil size={14} />
              </button>
              <button
                className="profile-list-action-btn is-danger"
                onClick={e => { e.stopPropagation(); onDelete(); }}
                title="Eliminar lista"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
          <ChevronDown size={18} className={`profile-list-chevron${expanded ? " is-open" : ""}`} />
        </div>
      </div>

      {expanded && (
        <div className="profile-list-expanded">
          {list.items.length === 0 && (
            <p className="profile-list-empty-msg">
              {editable ? "Busca juegos abajo para añadirlos." : "Esta lista está vacía."}
            </p>
          )}

          {list.items.map(item => (
            <div
              key={item.id}
              className={`profile-list-item-row${onViewGame ? " is-clickable" : ""}`}
              onClick={onViewGame ? () => onViewGame(item.rawgGameId) : undefined}
            >
              {item.coverUrl
                ? <img className="profile-list-item-cover" src={item.coverUrl} alt={item.title} />
                : <div className="profile-list-item-cover is-fallback">🎮</div>}
              <div className="profile-list-item-info">
                <p className="profile-list-item-title">{item.title}</p>
                <p className="profile-list-item-meta">
                  {[item.releasedAt, item.genres.slice(0, 2).join(", ")].filter(Boolean).join(" · ")}
                </p>
              </div>
              {editable && (
                <button
                  className="profile-list-item-remove"
                  onClick={e => { e.stopPropagation(); handleRemoveGame(item.rawgGameId); }}
                  title="Quitar de la lista"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}

          {editable && (
            <div className="profile-list-search-wrap" ref={searchRef}>
              <div className="profile-list-search-bar">
                <Search size={14} className="profile-list-search-icon" />
                <input
                  className="profile-list-search-input"
                  type="text"
                  placeholder="Añadir juego…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchLoading && <span className="profile-list-search-spinner" />}
              </div>
              {searchResults.length > 0 && (
                <div className="profile-list-search-results">
                  {searchResults.map(g => {
                    if (g.externalId == null) return null;
                    const alreadyIn = list.items.some(i => i.rawgGameId === g.externalId);
                    return (
                      <button
                        key={g.externalId}
                        className={`profile-list-search-result${alreadyIn ? " is-added" : ""}`}
                        onClick={() => !alreadyIn && handleAddGame(g.externalId!)}
                        disabled={alreadyIn}
                      >
                        {g.coverUrl
                          ? <img src={g.coverUrl} alt={g.title ?? ""} />
                          : <div className="profile-list-search-result-fallback">🎮</div>}
                        <span className="profile-list-search-result-name">{g.title}</span>
                        {alreadyIn && <span className="profile-list-search-result-tag">Ya añadido</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {confirm && <AppConfirm {...confirm} onCancel={() => setConfirm(null)} />}
    </article>
  );
}


const STATUS_ICON: Record<string, string> = {
  PLAYING: "🎮", COMPLETED: "✅", DROPPED: "❌", ON_HOLD: "⏸️",
  PLAN_TO_PLAY: "📋", REPLAYING: "🔄",
};

// Colores fijos (no dependen del tema) que coinciden con los chips de estado del modal
const ACTIVITY_STATUS_COLOR: Record<string, string> = {
  PLAYING:      "#3b82f6",
  COMPLETED:    "#22c55e",
  ON_HOLD:      "#f59e0b",
  DROPPED:      "#ef4444",
  REPLAYING:    "#8b5cf6",
  PLAN_TO_PLAY: "#94a3b8",
};

const ACTIVITY_COLOR: Record<string, string> = {
  REVIEW_PUBLISHED: "#f9a8d4",
  LIST_CREATED:     "#67e8f9",
  FOLLOWED_USER:    "#06b6d4",
  SCORE_UPDATED:    "#f97316",
  GAME_FAVORITED:   "#ef4444",
};

function ActivityItem({ event, selecting, selected, onToggle, onViewUser }: {
  event: ActivityEvent;
  selecting?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  onViewUser?: (username: string) => void;
}) {
  let icon = "🎮";
  let text = "";
  let accentColor = "#94a3b8";

  switch (event.eventType) {
    case "ENTRY_STATUS_CHANGED":
      icon = STATUS_ICON[event.newStatus ?? ""] ?? "🎮";
      text = `${STATUS_LABEL[event.newStatus as EntryStatus] ?? event.newStatus} · ${event.gameTitle}`;
      accentColor = ACTIVITY_STATUS_COLOR[event.newStatus ?? ""] ?? "#94a3b8";
      break;
    case "REVIEW_PUBLISHED":
      icon = "✍️";
      text = event.score != null
        ? `Reseñó ${event.gameTitle} con ${event.score.toFixed(1)}`
        : `Publicó una reseña de ${event.gameTitle}`;
      accentColor = ACTIVITY_COLOR.REVIEW_PUBLISHED;
      break;
    case "LIST_CREATED":
      icon = "📋";
      text = `Creó la lista "${event.listName}"`;
      accentColor = ACTIVITY_COLOR.LIST_CREATED;
      break;
    case "FOLLOWED_USER":
      icon = "👤";
      text = `Empezó a seguir a @${event.targetUsername}`;
      accentColor = ACTIVITY_COLOR.FOLLOWED_USER;
      break;
    case "SCORE_UPDATED":
      icon = "⭐";
      text = `Puntuó ${event.gameTitle} con ${event.score?.toFixed(1)}`;
      accentColor = ACTIVITY_COLOR.SCORE_UPDATED;
      break;
    case "GAME_FAVORITED":
      icon = "❤️";
      text = `Marcó ${event.gameTitle} como favorito`;
      accentColor = ACTIVITY_COLOR.GAME_FAVORITED;
      break;
  }

  return (
    <div
      className={`profile-activity-item${selected ? " is-selected" : ""}`}
      style={{ "--activity-color": accentColor } as React.CSSProperties}
      onClick={selecting ? onToggle : undefined}
    >
      {selecting && (
        <input type="checkbox" className="profile-activity-checkbox" checked={!!selected} onChange={onToggle} onClick={e => e.stopPropagation()} />
      )}
      {event.eventType === "FOLLOWED_USER" ? (
        event.targetAvatarUrl
          ? <img
              className="profile-activity-thumb profile-activity-avatar"
              src={event.targetAvatarUrl}
              alt={event.targetUsername ?? ""}
              style={{ cursor: onViewUser && event.targetUsername ? "pointer" : "default" }}
              onClick={!selecting && onViewUser && event.targetUsername ? () => onViewUser(event.targetUsername!) : undefined}
            />
          : <div
              className="profile-activity-icon profile-activity-avatar-placeholder"
              style={{ cursor: onViewUser && event.targetUsername ? "pointer" : "default" }}
              onClick={!selecting && onViewUser && event.targetUsername ? () => onViewUser(event.targetUsername!) : undefined}
            >👤</div>
      ) : event.gameCoverUrl
        ? <img className="profile-activity-thumb" src={event.gameCoverUrl} alt="" />
        : <div className="profile-activity-icon">{icon}</div>}
      <div className="profile-activity-content">
        <p className="profile-activity-text">{text}</p>
        <p className="profile-activity-time">{timeAgo(event.createdAt)}</p>
      </div>
    </div>
  );
}

export default function ProfilePage({ theme, onToggleTheme, onNavigate, onGoBack, refreshKey, user, onLogout, onUserUpdate, viewingUsername, onViewUser, onViewGame, onViewGames }: ProfilePageProps) {
  const [activeTab,     setActiveTab]     = useState<ProfileTab>("library");
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("ALL");
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [followModalTab, setFollowModalTab] = useState<FollowTab | null>(null);
  const scrolled = useScrolled();

  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  const isOwnProfile = !viewingUsername || viewingUsername === user?.username;

  const reloadProfile = useCallback(() => {
    if (isOwnProfile) {
      if (!user?.token) return;
      fetch(`${API_BASE}/api/users/me`, {
        headers: { Authorization: `Bearer ${user.token}` },
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then((d: ProfileData) => setProfileData(d))
        .catch(() => {});
    } else {
      const headers: Record<string, string> = {};
      if (user?.token) headers["Authorization"] = `Bearer ${user.token}`;
      fetch(`${API_BASE}/api/users/${viewingUsername}`, { headers })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then((d: ProfileData) => setProfileData(d))
        .catch(() => {});
    }
  }, [isOwnProfile, user?.token, viewingUsername]);

  useEffect(() => {
    setProfileData(null);
    reloadProfile();
  }, [user?.token, viewingUsername]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFollow = async () => {
    if (!user?.token || !viewingUsername) return;
    const res = await fetch(`${API_BASE}/api/users/${viewingUsername}/follow`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (res.status === 401 || res.status === 403) { onLogout(); return; }
    if (res.ok) setProfileData(await res.json());
  };

  const handleUnfollow = async () => {
    if (!user?.token || !viewingUsername) return;
    const res = await fetch(`${API_BASE}/api/users/${viewingUsername}/follow`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (res.status === 401 || res.status === 403) { onLogout(); return; }
    if (res.ok) setProfileData(await res.json());
  };

  const [entries,        setEntries]        = useState<GameEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [stats,          setStats]          = useState<LibraryStats | null>(null);
  const [favorites,      setFavorites]      = useState<GameEntry[]>([]);
  const [favsExpanded,   setFavsExpanded]   = useState(false);
  const [editingEntry,   setEditingEntry]   = useState<GameEntry | null>(null);
  const [confirm,        setConfirm]        = useState<ConfirmState | null>(null);

  const targetUsername = isOwnProfile ? user?.username : viewingUsername;

  const reloadLibrary = useCallback(async () => {
    if (!targetUsername) {
      setEntries([]); setFavorites([]); setStats(null); return;
    }
    setEntriesLoading(true);
    try {
      const statusQuery = libraryFilter === "ALL" ? "" : `&status=${libraryFilter}`;
      const headers: Record<string, string> = {};
      if (user?.token) headers["Authorization"] = `Bearer ${user.token}`;
      const [entriesRes, favsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/users/${targetUsername}/games?page=0&size=100${statusQuery}`, { headers }),
        fetch(`${API_BASE}/api/users/${targetUsername}/games/favorites`, { headers }),
        fetch(`${API_BASE}/api/users/${targetUsername}/games/stats`, { headers }),
      ]);
      if (entriesRes.ok) {
        const d = await entriesRes.json() as SpringPage<GameEntry>;
        setEntries(Array.isArray(d.content) ? d.content : []);
      } else {
        setEntries([]);
      }
      setFavorites(favsRes.ok ? await favsRes.json() : []);
      setStats(statsRes.ok ? await statsRes.json() : null);
    } finally {
      setEntriesLoading(false);
    }
  }, [targetUsername, libraryFilter, user?.token, refreshKey]);

  useEffect(() => { reloadLibrary(); }, [reloadLibrary]);

  const handleSaveEntry = async (entryId: number, draft: EntryDraft) => {
    if (!user?.token) return;
    const res = await fetch(`${API_BASE}/api/me/games/${entryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
      body: JSON.stringify({
        status:          draft.status,
        score:           draft.score,
        progressHours:   draft.progressHours,
        platformNote:    draft.platformNote,
        isFavorite:    draft.isFavorite,
        notePrivate:   draft.notePrivate,
        notePublic:    draft.notePublic,
      }),
    });
    if (res.status === 401 || res.status === 403) { onLogout(); return; }
    if (!res.ok) throw new Error("No se pudo guardar la entrada");
    setEditingEntry(null);
    await reloadLibrary();
  };

  const handleDeleteEntry = (entryId: number) => {
    if (!user?.token) return;
    setConfirm({
      message: "¿Eliminar este juego de tu biblioteca?",
      confirmLabel: "Eliminar",
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        const res = await fetch(`${API_BASE}/api/me/games/${entryId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (res.status === 401 || res.status === 403) { onLogout(); return; }
        if (res.ok) {
          setEditingEntry(null);
          await reloadLibrary();
        }
      },
    });
  };

  const [profileReviews,        setProfileReviews]        = useState<UserReview[]>([]);
  const [profileReviewsLoading, setProfileReviewsLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== "reviews" || !targetUsername) return;
    setProfileReviewsLoading(true);
    const headers: Record<string, string> = {};
    if (user?.token) headers["Authorization"] = `Bearer ${user.token}`;
    fetch(`${API_BASE}/api/users/${targetUsername}/reviews`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: UserReview[]) => setProfileReviews(data))
      .catch(() => setProfileReviews([]))
      .finally(() => setProfileReviewsLoading(false));
  }, [activeTab, targetUsername, user?.token]);

  const handleDeleteReview = (review: UserReview) => {
    if (!user?.token || review.rawgGameId == null) return;
    setConfirm({
      message: "¿Eliminar tu reseña? Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        const res = await fetch(`${API_BASE}/api/me/games/${review.rawgGameId}/review`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (res.status === 401 || res.status === 403) { onLogout(); return; }
        if (res.ok) setProfileReviews(prev => prev.filter(r => r.id !== review.id));
      },
    });
  };

  const [lists,           setLists]           = useState<UserList[]>([]);
  const [listsLoading,    setListsLoading]    = useState(false);
  const [listModalOpen,   setListModalOpen]   = useState(false);
  const [editingList,     setEditingList]     = useState<UserList | null>(null);
  const [listForm,        setListForm]        = useState({ name: "", description: "", isPublic: true });
  const [listFormError,   setListFormError]   = useState<string | null>(null);
  const [listFormLoading, setListFormLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== "lists" || !targetUsername) return;
    setListsLoading(true);
    const headers: Record<string, string> = {};
    if (user?.token) headers["Authorization"] = `Bearer ${user.token}`;
    fetch(`${API_BASE}/api/users/${targetUsername}/lists`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: UserList[]) => setLists(data))
      .catch(() => setLists([]))
      .finally(() => setListsLoading(false));
  }, [activeTab, targetUsername, user?.token]);

  const ACTIVITY_PAGE_SIZE = 10;
  const [activityEvents,   setActivityEvents]   = useState<ActivityEvent[]>([]);
  const [activityLoading,  setActivityLoading]  = useState(false);
  const [activityPage,     setActivityPage]     = useState(0);
  const [activityHasMore,  setActivityHasMore]  = useState(false);
  const [activitySelecting, setActivitySelecting] = useState(false);
  const [activitySelected,  setActivitySelected]  = useState<Set<number>>(new Set());
  const [confirmDeleteActivity, setConfirmDeleteActivity] = useState<ConfirmState | null>(null);

  const fetchActivity = (page: number, append: boolean) => {
    if (!targetUsername) return;
    setActivityLoading(true);
    fetch(`${API_BASE}/api/users/${targetUsername}/activity?page=${page}&size=${ACTIVITY_PAGE_SIZE}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: ActivityEvent[]) => {
        setActivityEvents(prev => append ? [...prev, ...data] : data);
        setActivityHasMore(data.length === ACTIVITY_PAGE_SIZE);
      })
      .catch(() => { if (!append) setActivityEvents([]); })
      .finally(() => setActivityLoading(false));
  };

  useEffect(() => {
    if (activeTab !== "activity") return;
    setActivityPage(0);
    setActivitySelecting(false);
    setActivitySelected(new Set());
    fetchActivity(0, false);
  }, [activeTab, targetUsername, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMoreActivity = () => {
    const next = activityPage + 1;
    setActivityPage(next);
    fetchActivity(next, true);
  };

  const toggleActivitySelect = (id: number) => {
    setActivitySelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleDeleteActivity = () => {
    if (activitySelected.size === 0) return;
    setConfirmDeleteActivity({
      message: `¿Eliminar ${activitySelected.size} registro${activitySelected.size > 1 ? "s" : ""} de actividad?`,
      onConfirm: async () => {
        await fetch(`${API_BASE}/api/me/activity`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${user!.token}` },
          body: JSON.stringify([...activitySelected]),
        });
        setActivityEvents(prev => prev.filter(e => !activitySelected.has(e.id)));
        setActivitySelected(new Set());
        setActivitySelecting(false);
        setConfirmDeleteActivity(null);
      },
    });
  };

  const openCreateList = () => {
    setEditingList(null);
    setListForm({ name: "", description: "", isPublic: true });
    setListFormError(null);
    setListModalOpen(true);
  };

  const openEditList = (list: UserList) => {
    setEditingList(list);
    setListForm({ name: list.name, description: list.description ?? "", isPublic: list.isPublic });
    setListFormError(null);
    setListModalOpen(true);
  };

  const handleSaveList = async () => {
    if (!user?.token || !listForm.name.trim()) return;
    setListFormLoading(true);
    setListFormError(null);
    try {
      const url    = editingList ? `${API_BASE}/api/me/lists/${editingList.id}` : `${API_BASE}/api/me/lists`;
      const method = editingList ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({
          name:        listForm.name.trim(),
          description: listForm.description.trim() || null,
          isPublic:    listForm.isPublic,
        }),
      });
      if (res.status === 401 || res.status === 403) { onLogout(); return; }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { message?: string }).message ?? "Error al guardar la lista");
      }
      const saved: UserList = await res.json();
      setLists(prev => editingList
        ? prev.map(l => l.id === saved.id ? saved : l)
        : [saved, ...prev]);
      setListModalOpen(false);
    } catch (err) {
      setListFormError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setListFormLoading(false);
    }
  };

  const handleDeleteList = (listId: number) => {
    if (!user?.token) return;
    setConfirm({
      message: "¿Eliminar esta lista? Se perderán todos los juegos que contiene.",
      confirmLabel: "Eliminar",
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        const res = await fetch(`${API_BASE}/api/me/lists/${listId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (res.status === 401 || res.status === 403) { onLogout(); return; }
        if (res.ok) setLists(prev => prev.filter(l => l.id !== listId));
      },
    });
  };

  const [editOpen,    setEditOpen]    = useState(false);
  const [editForm,    setEditForm]    = useState({ username: "", bio: "", country: "", avatar: "" });
  const [editError,   setEditError]   = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!countryOpen) return;
    const handler = (e: MouseEvent) => {
      if (!countryRef.current?.contains(e.target as Node)) setCountryOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [countryOpen]);

  const openEdit = () => {
    setEditForm({
      username: profileData?.username ?? user?.username ?? "",
      bio:      profileData?.bio      ?? "",
      country:  profileData?.countryCode ?? "",
      avatar:   profileData?.avatarUrl   ?? "",
    });
    setEditError(null);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!user?.token) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          username:    editForm.username || null,
          bio:         editForm.bio      || null,
          countryCode: editForm.country  || null,
          avatarUrl:   editForm.avatar   || null,
        }),
      });
      if (res.status === 401 || res.status === 403) { onLogout(); return; }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { message?: string }).message ?? "Error al guardar los cambios");
      }
      const updated: ProfileData = await res.json();
      setProfileData(updated);
      if (updated.username !== user.username || updated.avatarUrl !== user.avatarUrl) {
        onUserUpdate({ ...user, username: updated.username, avatarUrl: updated.avatarUrl ?? undefined });
      }
      setEditOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setEditLoading(false);
    }
  };

  const displayUsername = profileData?.username ?? user?.username ?? "";
  const displayBio      = profileData?.bio      ?? null;
  const displayCountry  = profileData?.countryCode ?? null;
  const displayAvatar   = profileData?.avatarUrl  ?? null;
  const displayJoined   = formatJoinedDate(profileData?.createdAt);


  return (
    <>
    <div className="page-wrapper profile-page">
      {searchOpen && (
        <SearchOverlay
          onClose={() => setSearchOpen(false)}
          onViewUser={onViewUser ?? (() => {})}
          onViewGame={onViewGame}
          token={user?.token}
          currentUsername={user?.username}
          onLoginRequested={() => onNavigate("login")}
          onGameAdded={() => { if (isOwnProfile) reloadLibrary(); }}
          onSessionExpired={onLogout}
          onFollowChanged={reloadProfile}
        />
      )}

      {followModalTab && (
        <FollowListModal
          username={displayUsername}
          initialTab={followModalTab}
          token={user?.token}
          currentUsername={user?.username}
          onClose={() => setFollowModalTab(null)}
          onViewUser={onViewUser ?? (() => {})}
          onFollowChanged={reloadProfile}
        />
      )}

      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={(draft: EntryDraft) => handleSaveEntry(editingEntry.id, draft)}
          onDelete={() => handleDeleteEntry(editingEntry.id)}
        />
      )}

      {editOpen && (
        <div className="edit-overlay" onClick={e => { if (e.target === e.currentTarget) setEditOpen(false); }}>
          <div className="edit-modal glass">
            <h2 className="edit-modal-title">Editar perfil</h2>

            <div className="edit-field">
              <label className="edit-label">Nombre de usuario</label>
              <input
                className="edit-input"
                type="text"
                value={editForm.username}
                onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))}
                maxLength={40}
                disabled={editLoading}
              />
            </div>

            <div className="edit-field">
              <label className="edit-label">Biografía</label>
              <textarea
                className="edit-input edit-textarea"
                value={editForm.bio}
                onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                maxLength={1000}
                rows={3}
                disabled={editLoading}
              />
            </div>

            <div className="edit-field">
              <label className="edit-label">País</label>
              <div className="country-select-wrap" ref={countryRef}>
                <button
                  type="button"
                  className={`country-select-btn${countryOpen ? " open" : ""}`}
                  onClick={() => setCountryOpen(o => !o)}
                  disabled={editLoading}
                >
                  {editForm.country ? (
                    <><CountryFlag code={editForm.country} />{" "}{COUNTRIES.find(c => c.code === editForm.country)?.name ?? editForm.country}</>
                  ) : <span className="country-placeholder">— Elige tu país —</span>}
                  <ChevronDown size={14} className="country-chevron" />
                </button>
                {countryOpen && (
                  <div className="country-dropdown">
                    <button
                      type="button"
                      className="country-option"
                      onClick={() => { setEditForm(f => ({ ...f, country: "" })); setCountryOpen(false); }}
                    >
                      <span className="country-placeholder">— Sin especificar —</span>
                    </button>
                    {COUNTRIES.map(c => (
                      <button
                        key={c.code}
                        type="button"
                        className={`country-option${editForm.country === c.code ? " selected" : ""}`}
                        onClick={() => { setEditForm(f => ({ ...f, country: c.code })); setCountryOpen(false); }}
                      >
                        <CountryFlag code={c.code} />{" "}{c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="edit-field">
              <label className="edit-label">Avatar</label>
              <div className="avatar-picker">
                {AVAILABLE_AVATARS.map(av => (
                  <button
                    key={av.id}
                    type="button"
                    className={`avatar-option${editForm.avatar === av.src ? " selected" : ""}`}
                    onClick={() => setEditForm(f => ({ ...f, avatar: av.src }))}
                    title={av.label}
                    disabled={editLoading}
                  >
                    <img src={av.src} alt={av.label} />
                  </button>
                ))}
              </div>
            </div>

            {editError && <p className="edit-error">{editError}</p>}

            <div className="edit-actions">
              <button className="edit-cancel-btn" onClick={() => setEditOpen(false)} disabled={editLoading}>
                Cancelar
              </button>
              <button className="edit-save-btn" onClick={handleEditSave} disabled={editLoading}>
                {editLoading ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {listModalOpen && (
        <div className="edit-overlay" onClick={e => { if (e.target === e.currentTarget) setListModalOpen(false); }}>
          <div className="edit-modal glass">
            <h2 className="edit-modal-title">{editingList ? "Editar lista" : "Nueva lista"}</h2>

            <div className="edit-field">
              <label className="edit-label">Título</label>
              <input
                className="edit-input"
                type="text"
                value={listForm.name}
                onChange={e => setListForm(f => ({ ...f, name: e.target.value }))}
                maxLength={100}
                disabled={listFormLoading}
                placeholder="Ej: Top RPGs de todos los tiempos"
              />
            </div>

            <div className="edit-field">
              <label className="edit-label">Descripción</label>
              <textarea
                className="edit-input edit-textarea"
                value={listForm.description}
                onChange={e => setListForm(f => ({ ...f, description: e.target.value }))}
                maxLength={500}
                rows={3}
                disabled={listFormLoading}
                placeholder="Opcional"
              />
            </div>

            <div className="edit-field">
              <label className="edit-label">Visibilidad</label>
              <div className="list-visibility-toggle">
                <button
                  type="button"
                  className={`list-vis-btn${listForm.isPublic ? " active" : ""}`}
                  onClick={() => setListForm(f => ({ ...f, isPublic: true }))}
                  disabled={listFormLoading}
                >
                  <Globe size={14} /> Pública
                </button>
                <button
                  type="button"
                  className={`list-vis-btn${!listForm.isPublic ? " active" : ""}`}
                  onClick={() => setListForm(f => ({ ...f, isPublic: false }))}
                  disabled={listFormLoading}
                >
                  <Lock size={14} /> Privada
                </button>
              </div>
            </div>

            {listFormError && <p className="edit-error">{listFormError}</p>}

            <div className="edit-actions">
              <button className="edit-cancel-btn" onClick={() => setListModalOpen(false)} disabled={listFormLoading}>
                Cancelar
              </button>
              <button className="edit-save-btn" onClick={handleSaveList} disabled={listFormLoading || !listForm.name.trim()}>
                {listFormLoading ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
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
                <Avatar url={user.avatarUrl} username={user.username} imgClassName="nav-avatar-img" />
              </button>
            ) : (
              <button className="nav-icon-btn" title="Iniciar sesión" onClick={() => onNavigate("login")}>
                <User size={20} strokeWidth={2} />
              </button>
            )}
            <button className="nav-theme-btn" onClick={onToggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
            </button>
            <button className="btn-search-pill" onClick={() => setSearchOpen(true)} title="Search game">
              <Search size={19} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="profile-header-card glass">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              <Avatar url={displayAvatar} username={displayUsername} imgClassName="profile-avatar-img" />
            </div>
          </div>

          <div className="profile-identity">
            <div className="profile-name-row">
              <h1 className="profile-username">@{displayUsername}</h1>
            </div>
            {displayBio && <p className="profile-bio">{displayBio}</p>}
            <div className="profile-meta-row">
              {displayCountry && (
                <span className="profile-meta-item">
                  <CountryFlag code={displayCountry} />{" "}
                  {COUNTRIES.find(c => c.code === displayCountry)?.name ?? displayCountry}
                </span>
              )}
              {displayJoined && (
                <span className="profile-meta-item">
                  <Calendar size={13} /> Se unió en {displayJoined}
                </span>
              )}
            </div>
          </div>

          <div className="profile-social">
            <>
              <button
                type="button"
                className="profile-social-stat profile-social-stat-btn"
                onClick={() => setFollowModalTab("followers")}
              >
                <span className="profile-social-num">{profileData?.followersCount ?? 0}</span>
                <span className="profile-social-label">Seguidores</span>
              </button>
              <div className="profile-social-divider" />
              <button
                type="button"
                className="profile-social-stat profile-social-stat-btn"
                onClick={() => setFollowModalTab("following")}
              >
                <span className="profile-social-num">{profileData?.followingCount ?? 0}</span>
                <span className="profile-social-label">Siguiendo</span>
              </button>
            </>
            <div className="profile-header-actions">
              {isOwnProfile ? (
                <>
                  {user && (
                    <button className="profile-edit-btn" onClick={openEdit}>
                      Editar perfil
                    </button>
                  )}
                  {user && (
                    <button className="profile-logout-btn" onClick={onLogout}>
                      Cerrar sesión
                    </button>
                  )}
                </>
              ) : (
                profileData?.isFollowing
                  ? <button className="profile-unfollow-btn" onClick={handleUnfollow}>Siguiendo</button>
                  : <button className="profile-follow-btn" onClick={user ? handleFollow : () => onNavigate("login")}>Seguir</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="profile-stats-bar">
          <div className="profile-stat-chip glass" style={{ ["--chip-color" as never]: "var(--text)" } as React.CSSProperties}>
            <span className="profile-stat-num">{stats?.total ?? 0}</span>
            <span className="profile-stat-label">Total</span>
          </div>
          <div className="profile-stat-chip glass" style={{ ["--chip-color" as never]: "var(--text-secondary)" } as React.CSSProperties}>
            <span className="profile-stat-num">{stats?.planToPlay ?? 0}</span>
            <span className="profile-stat-label">Pendientes</span>
          </div>
          <div className="profile-stat-chip glass" style={{ ["--chip-color" as never]: "var(--accent)" } as React.CSSProperties}>
            <span className="profile-stat-num">{stats?.playing ?? 0}</span>
            <span className="profile-stat-label">Jugando</span>
          </div>
          <div className="profile-stat-chip glass" style={{ ["--chip-color" as never]: "#22c55e" } as React.CSSProperties}>
            <span className="profile-stat-num">{stats?.completed ?? 0}</span>
            <span className="profile-stat-label">Completados</span>
          </div>
          <div className="profile-stat-chip glass" style={{ ["--chip-color" as never]: "#8b5cf6" } as React.CSSProperties}>
            <span className="profile-stat-num">{stats?.replaying ?? 0}</span>
            <span className="profile-stat-label">Rejugando</span>
          </div>
          <div className="profile-stat-chip glass" style={{ ["--chip-color" as never]: "#f59e0b" } as React.CSSProperties}>
            <span className="profile-stat-num">{stats?.onHold ?? 0}</span>
            <span className="profile-stat-label">En pausa</span>
          </div>
          <div className="profile-stat-chip glass" style={{ ["--chip-color" as never]: "#ef4444" } as React.CSSProperties}>
            <span className="profile-stat-num">{stats?.dropped ?? 0}</span>
            <span className="profile-stat-label">Abandonados</span>
          </div>
          <div className="profile-stat-chip glass" style={{ ["--chip-color" as never]: "var(--accent)" } as React.CSSProperties}>
            <span className="profile-stat-num">
              {stats?.meanScore != null ? Number(stats.meanScore).toFixed(1) : "—"}
            </span>
            <span className="profile-stat-label">Nota media</span>
          </div>
          <div className="profile-stat-chip glass" style={{ ["--chip-color" as never]: "#06b6d4" } as React.CSSProperties}>
            <span className="profile-stat-num">
              {Number(stats?.totalHours ?? 0).toLocaleString("es-ES", { maximumFractionDigits: 1 })}
            </span>
            <span className="profile-stat-label">Horas</span>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="profile-tabs">
          {(["library", "reviews", "lists", "activity"] as ProfileTab[]).map(tab => (
            <button
              key={tab}
              className={`profile-tab${activeTab === tab ? " active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "library"  && <><BookOpen size={14} /> Biblioteca</>}
              {tab === "reviews"  && <><Star     size={14} /> Reseñas</>}
              {tab === "lists"    && <><List     size={14} /> Listas</>}
              {tab === "activity" && <><Activity size={14} /> Actividad</>}
            </button>
          ))}
        </div>
      </div>

      <div className="container profile-content">

        {activeTab === "library" && (
          <div>
            {favorites.length > 0 && (() => {
              const FAV_LIMIT = 8;
              const visible = favsExpanded ? favorites : favorites.slice(0, FAV_LIMIT);
              return (
                <div className="profile-favorites">
                  <h3 className="profile-section-title">
                    <Heart size={15} /> Favoritos
                  </h3>
                  <div className="profile-fav-wall">
                    {visible.map(entry => (
                      <div
                        key={entry.id}
                        className={`profile-fav-poster${onViewGame ? " is-clickable" : ""}`}
                        onClick={onViewGame ? () => onViewGame(entry.rawgGameId) : undefined}
                      >
                        {entry.coverUrl
                          ? <img src={entry.coverUrl} alt={entry.title} />
                          : <div className="profile-fav-fallback">🎮</div>}
                        <div className="profile-fav-title-overlay">
                          <p>{entry.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {favorites.length > FAV_LIMIT && (
                    <button
                      className="profile-fav-expand-btn"
                      onClick={() => setFavsExpanded(e => !e)}
                    >
                      {favsExpanded ? "Ver menos" : `Ver todos (${favorites.length})`}
                    </button>
                  )}
                </div>
              );
            })()}

            <div className="profile-filter-bar">
              {(["ALL", ...GAME_STATUS_ORDER] as LibraryFilter[]).map(f => (
                <button
                  key={f}
                  className={`profile-filter-btn${libraryFilter === f ? " active" : ""}`}
                  onClick={() => setLibraryFilter(f)}
                >
                  {f === "ALL" ? "Todos" : STATUS_LABEL[f as EntryStatus]}
                </button>
              ))}
            </div>

            <div className="profile-entries-list glass">
              {entries.map(entry => (
                <GameEntryRow
                  key={entry.id}
                  entry={entry}
                  editable={isOwnProfile && !!user}
                  onNavigate={onViewGame ? () => onViewGame(entry.rawgGameId) : undefined}
                  onEdit={isOwnProfile && !!user ? () => setEditingEntry(entry) : undefined}
                  onDelete={isOwnProfile && !!user ? () => handleDeleteEntry(entry.id) : undefined}
                />
              ))}
              {!entriesLoading && entries.length === 0 && (
                <p className="profile-empty">
                  {libraryFilter === "ALL"
                    ? (isOwnProfile
                        ? "Aún no tienes juegos en tu biblioteca. Búscalos y añádelos desde el buscador."
                        : "Este usuario aún no tiene juegos en su biblioteca.")
                    : "No hay juegos en esta categoría."}
                </p>
              )}
              {entriesLoading && entries.length === 0 && (
                <p className="profile-empty">Cargando…</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="profile-reviews-list">
            {profileReviewsLoading && profileReviews.length === 0 && (
              <p className="profile-empty">Cargando…</p>
            )}
            {!profileReviewsLoading && profileReviews.length === 0 && (
              <p className="profile-empty">
                {isOwnProfile ? "Aún no has escrito ninguna reseña." : "Este usuario aún no ha escrito ninguna reseña."}
              </p>
            )}
            {profileReviews.map(review => (
              <ReviewCard
                key={review.id}
                review={review}
                onViewGame={onViewGame}
                token={user?.token}
                onDelete={isOwnProfile && user ? () => handleDeleteReview(review) : undefined}
                onSaved={isOwnProfile && user ? updated => setProfileReviews(prev => prev.map(r => r.id === updated.id ? updated : r)) : undefined}
              />
            ))}
          </div>
        )}

        {activeTab === "lists" && (
          <div className="profile-lists-section">
            {isOwnProfile && user && (
              <div className="profile-lists-topbar">
                <button className="profile-new-list-btn" onClick={openCreateList}>
                  <Plus size={15} /> Nueva lista
                </button>
              </div>
            )}
            {listsLoading && <p className="profile-empty">Cargando…</p>}
            {!listsLoading && lists.length === 0 && (
              <p className="profile-empty">
                {isOwnProfile
                  ? "Aún no tienes ninguna lista. Crea tu primera lista."
                  : "Este usuario no tiene listas públicas."}
              </p>
            )}
            <div className="profile-lists-grid">
              {lists.map(list => (
                <ListCard
                  key={list.id}
                  list={list}
                  editable={isOwnProfile && !!user}
                  token={user?.token}
                  onEdit={() => openEditList(list)}
                  onDelete={() => handleDeleteList(list.id)}
                  onItemChanged={updated => setLists(prev => prev.map(l => l.id === updated.id ? updated : l))}
                  onSessionExpired={onLogout}
                  onViewGame={onViewGame}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className={`profile-activity-feed glass${activitySelecting ? " is-selecting" : ""}`}>
            {isOwnProfile && activityEvents.length > 0 && (
              <div className="profile-activity-toolbar">
                {activitySelecting ? (
                  <>
                    <span className="profile-activity-select-count">
                      {activitySelected.size} seleccionado{activitySelected.size !== 1 ? "s" : ""}
                    </span>
                    <button
                      className="profile-activity-delete-btn"
                      disabled={activitySelected.size === 0}
                      onClick={handleDeleteActivity}
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                    <button className="profile-activity-cancel-btn" onClick={() => { setActivitySelecting(false); setActivitySelected(new Set()); }}>
                      <X size={14} /> Cancelar
                    </button>
                  </>
                ) : (
                  <button className="profile-activity-edit-btn" onClick={() => setActivitySelecting(true)}>
                    <Pencil size={14} /> Editar
                  </button>
                )}
              </div>
            )}
            {activityLoading && activityEvents.length === 0 && (
              <p className="profile-activity-empty">Cargando actividad…</p>
            )}
            {!activityLoading && activityEvents.length === 0 && (
              <p className="profile-activity-empty">Aún no hay actividad registrada.</p>
            )}
            {activityEvents.map(event => (
              <ActivityItem
                key={event.id}
                event={event}
                selecting={activitySelecting}
                selected={activitySelected.has(event.id)}
                onToggle={() => toggleActivitySelect(event.id)}
                onViewUser={onViewUser}
              />
            ))}
            {activityHasMore && (
              <button className="profile-load-more-btn" onClick={loadMoreActivity} disabled={activityLoading}>
                {activityLoading ? "Cargando…" : "Cargar más"}
              </button>
            )}
          </div>
        )}

      </div>

      <div className="profile-footer-spacer" />
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
    {confirmDeleteActivity && (
      <AppConfirm
        message={confirmDeleteActivity.message}
        confirmLabel="Eliminar"
        danger
        onConfirm={confirmDeleteActivity.onConfirm}
        onCancel={() => setConfirmDeleteActivity(null)}
      />
    )}
    </>
  );
}
