import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Globe, Lock, Moon, Sun, Trash2 } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import type { AuthUser } from "../App";
import { API_BASE } from "../config";
import Avatar from "../components/Avatar";
import AppConfirm, { type ConfirmState } from "../components/AppConfirm";
import { timeAgo, formatDate } from "../lib/dateUtils";

type AdminUser = {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  reviewCount: number;
  listCount: number;
  noteCount: number;
  admin: boolean;
};

type AdminReview = {
  id: number;
  gameId: number;
  gameName: string;
  coverUrl: string | null;
  title: string;
  body: string;
  score: number | null;
  containsSpoilers: boolean;
  createdAt: string;
};

type AdminList = {
  id: number;
  name: string;
  description: string | null;
  isPublic: boolean;
  itemCount: number;
  createdAt: string;
};

type AdminNote = {
  id: number;
  gameId: number;
  gameName: string;
  coverUrl: string | null;
  status: string;
  score: number | null;
  notePublic: string | null;
  notePrivate: string | null;
};

type SpringPage<T> = {
  content: T[];
  totalPages: number;
  number: number;
};

type AdminStats = {
  totalUsers: number;
  totalReviews: number;
  totalLists: number;
  averageScore: number;
  statusDistribution: { status: string; count: number }[];
  scoreHistogram: { score: number; count: number }[];
  topGamesByEntries: { gameName: string; coverUrl: string | null; count: number }[];
  topGamesByReviews: { gameName: string; coverUrl: string | null; count: number }[];
  genreDistribution: { genre: string; count: number }[];
};

type AdminFeedItem = {
  id: number;
  userId: number;
  username: string;
  avatarUrl: string | null;
  eventType: string;
  gameTitle: string | null;
  gameCoverUrl: string | null;
  newStatus: string | null;
  score: number | null;
  listName: string | null;
  targetUsername: string | null;
  createdAt: string;
};

type AdminRankingUser = {
  id: number;
  username: string;
  avatarUrl: string | null;
  entryCount: number;
  reviewCount: number;
  listCount: number;
  total: number;
};

const STATUS_LABELS: Record<string, string> = {
  PLAN_TO_PLAY: "Pendiente", PLAYING: "Jugando", COMPLETED: "Completado",
  ON_HOLD: "En pausa", DROPPED: "Abandonado", REPLAYING: "Rejugando",
};

const STATUS_COLORS: Record<string, string> = {
  PLAYING:      "#3b82f6",
  COMPLETED:    "#22c55e",
  PLAN_TO_PLAY: "#a855f7",
  ON_HOLD:      "#f59e0b",
  DROPPED:      "#ef4444",
  REPLAYING:    "#06b6d4",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  REVIEW_PUBLISHED: "#f9a8d4",
  LIST_CREATED:     "#67e8f9",
  FOLLOWED_USER:    "#06b6d4",
  SCORE_UPDATED:    "#f97316",
  GAME_FAVORITED:   "#ef4444",
};

const GENRE_PALETTE = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];


function feedColor(item: AdminFeedItem): string {
  if (item.eventType === "ENTRY_STATUS_CHANGED") return STATUS_COLORS[item.newStatus ?? ""] ?? "#6b7280";
  return EVENT_TYPE_COLORS[item.eventType] ?? "#6b7280";
}

function feedText(item: AdminFeedItem): string {
  switch (item.eventType) {
    case "ENTRY_STATUS_CHANGED": return `marcó "${item.gameTitle}" como ${STATUS_LABELS[item.newStatus ?? ""] ?? item.newStatus}`;
    case "REVIEW_PUBLISHED":     return `publicó una reseña de "${item.gameTitle}"${item.score != null ? ` (★ ${item.score})` : ""}`;
    case "LIST_CREATED":         return `creó la lista "${item.listName}"`;
    case "FOLLOWED_USER":        return `siguió a @${item.targetUsername}`;
    case "SCORE_UPDATED":        return `puntuó "${item.gameTitle}" con ★ ${item.score}`;
    case "GAME_FAVORITED":       return `marcó "${item.gameTitle}" como favorito ❤️`;
    default:                     return item.eventType;
  }
}

type Props = {
  user: AuthUser;
  onLogout: () => void;
  onToggleTheme: () => void;
  theme: "light" | "dark";
};

type AccordionCardProps = {
  user: AdminUser;
  tab: "reviews" | "lists" | "notes";
  token: string;
  onLogout: () => void;
  onDeleteReview: (id: number, title: string, onSuccess: () => void) => void;
  onDeleteList: (id: number, name: string, onSuccess: () => void) => void;
  onDeleteNotePublic: (id: number, gameName: string, onSuccess: () => void) => void;
  onDeleteNotePrivate: (id: number, gameName: string, onSuccess: () => void) => void;
  onDecrement: () => void;
  countLabel: string;
  count: number;
};

function AccordionCard({
  user, tab, token, onLogout,
  onDeleteReview, onDeleteList, onDeleteNotePublic, onDeleteNotePrivate,
  onDecrement, countLabel, count,
}: AccordionCardProps) {
  const [open, setOpen]     = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [lists,   setLists]   = useState<AdminList[]>([]);
  const [notes,   setNotes]   = useState<AdminNote[]>([]);

  const toggle = () => {
    if (!open && !loaded) {
      setLoading(true);
      fetch(`${API_BASE}/api/admin/users/${user.id}/${tab}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => { if (r.status === 401) { onLogout(); return null; } return r.json(); })
        .then((d: AdminReview[] | AdminList[] | AdminNote[] | null) => {
          if (!d) return;
          if (tab === "reviews") setReviews(d as AdminReview[]);
          else if (tab === "lists") setLists(d as AdminList[]);
          else setNotes(d as AdminNote[]);
          setLoaded(true);
        })
        .finally(() => setLoading(false));
    }
    setOpen(v => !v);
  };

  if (count === 0) return null;

  return (
    <div className={`admin-accordion${open ? " is-open" : ""}`}>
      <button className="admin-accordion-header" onClick={toggle}>
        <div className="admin-user-cell">
          <Avatar url={user.avatarUrl} username={user.username} imgClassName="admin-avatar" fallbackClassName="admin-avatar admin-avatar--initials" />
          <span className="admin-username">@{user.username}</span>
        </div>
        <span className="admin-count-badge">{count} {countLabel}</span>
        {open ? <ChevronUp size={16} strokeWidth={2} className="admin-chevron" /> : <ChevronDown size={16} strokeWidth={2} className="admin-chevron" />}
      </button>

      {open && (
        <div className="admin-accordion-body">
          {loading && (
            <div className="admin-accordion-loading">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="admin-row-skeleton admin-row-skeleton--sm" />)}
            </div>
          )}

          {!loading && tab === "reviews" && reviews.map(r => (
            <div className="admin-accordion-item" key={r.id}>
              <div className="admin-game-cell">
                {r.coverUrl && <img src={r.coverUrl} alt={r.gameName} className="admin-cover" />}
                <div className="admin-accordion-item-info">
                  <span className="admin-cell-primary">{r.gameName}</span>
                  <span className="admin-cell-secondary admin-review-title">"{r.title}"</span>
                </div>
              </div>
              <div className="admin-accordion-item-meta">
                {r.score != null && <span className="admin-score-badge">★ {r.score}</span>}
                {r.containsSpoilers && <span className="admin-spoiler-badge">Spoiler</span>}
                <span className="admin-cell-secondary">{formatDate(r.createdAt)}</span>
              </div>
              <button className="admin-delete-btn" onClick={() => onDeleteReview(r.id, r.title, () => {
                setReviews(prev => prev.filter(x => x.id !== r.id));
                onDecrement();
              })} title="Eliminar reseña"><Trash2 size={14} strokeWidth={2} /></button>
            </div>
          ))}

          {!loading && tab === "lists" && lists.map(l => (
            <div className="admin-accordion-item" key={l.id}>
              <div className="admin-accordion-item-info" style={{ flex: 1 }}>
                <span className="admin-cell-primary">{l.name}</span>
                {l.description && <span className="admin-cell-secondary">{l.description}</span>}
              </div>
              <div className="admin-accordion-item-meta">
                <span className="admin-cell-secondary">{l.itemCount} juegos</span>
                <span className={`admin-note-badge${l.isPublic ? "" : " admin-note-badge--private"}`} title={l.isPublic ? "Lista pública" : "Lista privada"}>
                  {l.isPublic ? <Globe size={11} /> : <Lock size={11} />}
                </span>
                <span className="admin-cell-secondary">{formatDate(l.createdAt)}</span>
              </div>
              <button className="admin-delete-btn" onClick={() => onDeleteList(l.id, l.name, () => {
                setLists(prev => prev.filter(x => x.id !== l.id));
                onDecrement();
              })} title="Eliminar lista"><Trash2 size={14} strokeWidth={2} /></button>
            </div>
          ))}

          {!loading && tab === "notes" && notes.map(n => (
            <div className="admin-accordion-item admin-accordion-item--notes" key={n.id}>
              <div className="admin-game-cell">
                {n.coverUrl && <img src={n.coverUrl} alt={n.gameName} className="admin-cover" />}
                <div className="admin-accordion-item-info">
                  <span className="admin-cell-primary">{n.gameName}</span>
                  <span className="admin-cell-secondary">{STATUS_LABELS[n.status] ?? n.status}{n.score != null ? ` · ★ ${n.score}` : ""}</span>
                </div>
              </div>
              <div className="admin-notes-content">
                {n.notePublic && (
                  <div className="admin-note-row">
                    <span className="admin-note-badge" title="Nota pública"><Globe size={11} /></span>
                    <span className="admin-note-text">{n.notePublic}</span>
                    <button className="admin-delete-btn admin-delete-btn--sm" onClick={() => onDeleteNotePublic(n.id, n.gameName, () => {
                      setNotes(prev => prev.map(x => x.id === n.id ? { ...x, notePublic: null } : x));
                      if (!n.notePrivate) onDecrement();
                    })} title="Borrar nota pública"><Trash2 size={12} strokeWidth={2} /></button>
                  </div>
                )}
                {n.notePrivate && (
                  <div className="admin-note-row">
                    <span className="admin-note-badge admin-note-badge--private" title="Nota privada"><Lock size={11} /></span>
                    <span className="admin-note-text">{n.notePrivate}</span>
                    <button className="admin-delete-btn admin-delete-btn--sm" onClick={() => onDeleteNotePrivate(n.id, n.gameName, () => {
                      setNotes(prev => prev.map(x => x.id === n.id ? { ...x, notePrivate: null } : x));
                      if (!n.notePublic) onDecrement();
                    })} title="Borrar nota privada"><Trash2 size={12} strokeWidth={2} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {!loading && loaded && tab === "reviews" && reviews.length === 0 && <p className="admin-accordion-empty">Sin reseñas.</p>}
          {!loading && loaded && tab === "lists"   && lists.length   === 0 && <p className="admin-accordion-empty">Sin listas.</p>}
          {!loading && loaded && tab === "notes"   && notes.length   === 0 && <p className="admin-accordion-empty">Sin notas.</p>}
        </div>
      )}
    </div>
  );
}

function TopGamesCard({ title, games, loading }: { title: string; games: { gameName: string; coverUrl: string | null; count: number }[]; loading: boolean }) {
  return (
    <div className="bento-card glass">
      <h3 className="bento-card-title">{title}</h3>
      {loading ? <div className="bento-chart-skeleton" /> : (
        <div className="bento-top-list">
          {games.map((g, i) => (
            <div key={i} className="bento-top-row">
              <span className="bento-top-rank">#{i + 1}</span>
              {g.coverUrl && <img src={g.coverUrl} alt={g.gameName} className="bento-top-cover" />}
              <span className="bento-top-name">{g.gameName}</span>
              <span className="bento-top-count">{g.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bento-card bento-stat-card glass">
      <span className="bento-stat-value">{value}</span>
      <span className="bento-stat-label">{label}</span>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bento-tooltip glass">
      {label && <p className="bento-tooltip-label">{label}</p>}
      <p className="bento-tooltip-value">{payload[0].value.toLocaleString()}</p>
    </div>
  );
}

export default function AdminPage({ user, onLogout, onToggleTheme, theme }: Props) {
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const [users, setUsers]             = useState<AdminUser[]>([]);
  const [usersPage, setUsersPage]     = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);

  const [stats, setStats]       = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsKey, setStatsKey] = useState(0);

  const [feed, setFeed]       = useState<AdminFeedItem[]>([]);
  const [ranking, setRanking] = useState<AdminRankingUser[]>([]);

  const [reviewTab, setReviewTab] = useState<"reviews" | "lists" | "notes">("reviews");
  const [donutTab, setDonutTab]   = useState<"status" | "genres">("status");

  const headers = { Authorization: `Bearer ${user.token}` };

  const reloadStats = () => setStatsKey(k => k + 1);

  useEffect(() => {
    setUsersLoading(true);
    fetch(`${API_BASE}/api/admin/users?page=${usersPage}&size=20`, { headers })
      .then(r => { if (r.status === 401) { onLogout(); return null; } return r.json(); })
      .then((d: SpringPage<AdminUser> | null) => {
        if (!d) return;
        setUsers(d.content);
        setUsersTotalPages(d.totalPages);
      })
      .finally(() => setUsersLoading(false));
  }, [usersPage, statsKey]);

  useEffect(() => {
    setStatsLoading(true);
    fetch(`${API_BASE}/api/admin/stats`, { headers })
      .then(r => { if (r.status === 401) { onLogout(); return null; } return r.json(); })
      .then((d: AdminStats | null) => { if (d) setStats(d); })
      .finally(() => setStatsLoading(false));
    fetch(`${API_BASE}/api/admin/feed`, { headers })
      .then(r => { if (r.status === 401) { onLogout(); return null; } return r.json(); })
      .then((d: AdminFeedItem[] | null) => { if (d) setFeed(d); });
    fetch(`${API_BASE}/api/admin/ranking`, { headers })
      .then(r => { if (r.status === 401) { onLogout(); return null; } return r.json(); })
      .then((d: AdminRankingUser[] | null) => { if (d) setRanking(d); });
  }, [statsKey]);

  const decrementCount = (userId: number, field: "reviewCount" | "listCount" | "noteCount") => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, [field]: Math.max(0, u[field] - 1) } : u
    ));
  };

  const deleteUser = (id: number, username: string) => {
    setConfirm({
      message: `¿Eliminar al usuario @${username}? Se borrarán todas sus reseñas, listas y notas.`,
      confirmLabel: "Eliminar",
      onConfirm: async () => {
        const r = await fetch(`${API_BASE}/api/admin/users/${id}`, { method: "DELETE", headers });
        if (r.ok) { setUsers(prev => prev.filter(u => u.id !== id)); reloadStats(); }
        setConfirm(null);
      },
    });
  };

  const deleteReview = (id: number, title: string, onSuccess: () => void) => {
    setConfirm({
      message: `¿Eliminar la reseña "${title}"?`,
      confirmLabel: "Eliminar",
      onConfirm: async () => {
        const r = await fetch(`${API_BASE}/api/admin/reviews/${id}`, { method: "DELETE", headers });
        if (r.ok) { onSuccess(); reloadStats(); }
        setConfirm(null);
      },
    });
  };

  const deleteList = (id: number, name: string, onSuccess: () => void) => {
    setConfirm({
      message: `¿Eliminar la lista "${name}"?`,
      confirmLabel: "Eliminar",
      onConfirm: async () => {
        const r = await fetch(`${API_BASE}/api/admin/lists/${id}`, { method: "DELETE", headers });
        if (r.ok) { onSuccess(); reloadStats(); }
        setConfirm(null);
      },
    });
  };

  const makeDeleteNote = (field: "public" | "private") => (id: number, gameName: string, onSuccess: () => void) => {
    const label = field === "public" ? "pública" : "privada";
    setConfirm({
      message: `¿Eliminar la nota ${label} de "${gameName}"?`,
      confirmLabel: "Eliminar",
      onConfirm: async () => {
        const r = await fetch(`${API_BASE}/api/admin/entries/${id}/note-${field}`, { method: "DELETE", headers });
        if (r.ok) { onSuccess(); reloadStats(); }
        setConfirm(null);
      },
    });
  };

  const deleteNotePublic  = makeDeleteNote("public");
  const deleteNotePrivate = makeDeleteNote("private");

  const statusData = (stats?.statusDistribution ?? []).map(s => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] ?? "#6b7280",
  }));

  const genreData = (stats?.genreDistribution ?? []).map((g, i) => ({
    name: g.genre,
    value: g.count,
    color: GENRE_PALETTE[i % GENRE_PALETTE.length],
  }));

  const scoreData = Array.from({ length: 10 }, (_, i) => {
    const score = i + 1;
    const found = stats?.scoreHistogram.find(s => s.score === score);
    return { score: String(score), count: found?.count ?? 0 };
  });

  const scoreMax   = Math.max(...scoreData.map(s => s.count), 0);
  const scoreYMax  = Math.max(Math.ceil(scoreMax / 5) * 5, 10);
  const scoreTicks = Array.from({ length: scoreYMax / 5 + 1 }, (_, i) => i * 5);

  const accentColor = theme === "dark" ? "#9D2E27" : "#0071e3";

  return (
    <div className="page-wrapper admin-page">

      <nav className="navbar">
        <div className="navbar-inner">
          <span className="nav-brand" style={{ cursor: "default" }}>
            <img src={`/media/logo-${theme === "dark" ? "oscuro" : "claro"}.png`} alt="GameDeck" className="brand-logo-img" />
            GameDeck
          </span>
          <div className="nav-spacer" />
          <span className="admin-nav-badge">Panel Admin</span>
          <button className="profile-logout-btn" onClick={onLogout}>
            Cerrar sesión
          </button>
          <button className="nav-theme-btn" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
          </button>
        </div>
      </nav>

      <div className="admin-bento-wrapper container">

        <div className="bento-row bento-row--stats">
          <StatCard label="Usuarios" value={statsLoading ? "—" : (stats?.totalUsers ?? 0).toLocaleString()} />
          <StatCard label="Reseñas" value={statsLoading ? "—" : (stats?.totalReviews ?? 0).toLocaleString()} />
          <StatCard label="Listas" value={statsLoading ? "—" : (stats?.totalLists ?? 0).toLocaleString()} />
          <StatCard label="Puntuación media" value={statsLoading ? "—" : (stats?.averageScore ?? 0).toFixed(1)} />
        </div>

        <div className="bento-row bento-row--charts">
          <div className="bento-card glass">
            <div className="bento-card-header-row">
              <h3 className="bento-card-title">Biblioteca</h3>
              <div className="bento-donut-tabs">
                <button className={`bento-donut-tab${donutTab === "status" ? " active" : ""}`} onClick={() => setDonutTab("status")}>Estados</button>
                <button className={`bento-donut-tab${donutTab === "genres" ? " active" : ""}`} onClick={() => setDonutTab("genres")}>Géneros</button>
              </div>
            </div>
            {statsLoading ? <div className="bento-chart-skeleton" /> : (() => {
              const data = donutTab === "status" ? statusData : genreData;
              return <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="bento-legend">
                  {data.map(s => (
                    <span key={s.name} className="bento-legend-item">
                      <span className="bento-legend-dot" style={{ background: s.color }} />
                      {s.name}
                    </span>
                  ))}
                </div>
              </>;
            })()}
          </div>

          <div className="bento-card glass">
            <h3 className="bento-card-title">Puntuaciones de biblioteca</h3>
            {statsLoading ? <div className="bento-chart-skeleton" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={scoreData} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="score" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} label={{ value: "Puntuación", position: "insideBottom", offset: -2, fontSize: 11, fill: "var(--text-secondary)" }} height={42} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={50} domain={[0, scoreYMax]} ticks={scoreTicks} label={{ value: "Entradas", angle: -90, position: "insideLeft", offset: 14, fontSize: 11, fill: "var(--text-secondary)" }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--border-color)", opacity: 0.4 }} />
                  <Bar dataKey="count" fill={accentColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bento-row bento-row--charts">
          <TopGamesCard title="Top juegos más añadidos" games={stats?.topGamesByEntries ?? []} loading={statsLoading} />
          <TopGamesCard title="Top juegos más reseñados" games={stats?.topGamesByReviews ?? []} loading={statsLoading} />
        </div>

        <div className="bento-row bento-row--live">
          <div className="bento-card glass bento-card--feed">
            <h3 className="bento-card-title">Actividad reciente</h3>
            <div className="bento-feed-list">
              {feed.length === 0
                ? <p className="admin-empty">Sin actividad todavía.</p>
                : feed.map(item => (
                  <div key={item.id} className="bento-feed-item">
                    <span className="bento-feed-dot" style={{ background: feedColor(item) }} />
                    <Avatar url={item.avatarUrl} username={item.username} imgClassName="bento-feed-avatar" fallbackClassName="bento-feed-avatar bento-feed-avatar--initials" />
                    <p className="bento-feed-text">
                      <span className="bento-feed-user">@{item.username}</span>
                      {" "}{feedText(item)}
                    </p>
                    <span className="bento-feed-time">{timeAgo(item.createdAt)}</span>
                  </div>
                ))
              }
            </div>
          </div>

          <div className="bento-card glass bento-card--ranking">
            <h3 className="bento-card-title">Ranking de usuarios</h3>
            <div className="bento-ranking-list">
              {ranking.length === 0
                ? <p className="admin-empty">Sin datos todavía.</p>
                : ranking.map((u, i) => {
                  const pct = ranking[0].total > 0 ? (u.total / ranking[0].total) * 100 : 0;
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                  return (
                    <div key={u.id} className="bento-ranking-row">
                      <span className="bento-ranking-pos">{medal ?? `${i + 1}.`}</span>
                      <Avatar url={u.avatarUrl} username={u.username} imgClassName="bento-feed-avatar" fallbackClassName="bento-feed-avatar bento-feed-avatar--initials" />
                      <div className="bento-ranking-info">
                        <span className="bento-ranking-name">@{u.username}</span>
                        <div className="bento-ranking-bar-wrap">
                          <div className="bento-ranking-bar" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="bento-ranking-counts">
                        <span className="bento-ranking-total">{u.total}</span>
                        <span className="bento-ranking-breakdown">{u.entryCount}e · {u.reviewCount}r · {u.listCount}l</span>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        </div>

        <div className="bento-card bento-card--full glass">
          <h3 className="bento-card-title">Usuarios</h3>
          {usersLoading ? (
            <div className="admin-loading">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="admin-row-skeleton" />)}
            </div>
          ) : (
            <div className="admin-user-list">
              {users.map(u => (
                <div className="admin-user-row" key={u.id}>
                  <div className="admin-user-cell">
                    <Avatar url={u.avatarUrl} username={u.username} imgClassName="admin-avatar" fallbackClassName="admin-avatar admin-avatar--initials" />
                    <div className="admin-user-row-info">
                      <span className="admin-username">@{u.username}</span>
                      <span className="admin-cell-secondary">{u.email}</span>
                    </div>
                  </div>
                  <div className="admin-user-row-counts">
                    {u.reviewCount > 0 && <span className="admin-count-pill">{u.reviewCount} reseñas</span>}
                    {u.listCount   > 0 && <span className="admin-count-pill">{u.listCount} listas</span>}
                    {u.noteCount   > 0 && <span className="admin-count-pill">{u.noteCount} notas</span>}
                  </div>
                  <span className="admin-cell-secondary admin-user-date">{formatDate(u.createdAt)}</span>
                  {!u.admin && (
                    <button className="admin-delete-btn" onClick={() => deleteUser(u.id, u.username)} title="Eliminar usuario">
                      <Trash2 size={15} strokeWidth={2} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {usersTotalPages > 1 && (
            <div className="admin-pagination">
              <button className="admin-page-btn" disabled={usersPage === 0} onClick={() => setUsersPage(p => p - 1)}>‹ Anterior</button>
              <span className="admin-page-info">Página {usersPage + 1} de {usersTotalPages}</span>
              <button className="admin-page-btn" disabled={usersPage >= usersTotalPages - 1} onClick={() => setUsersPage(p => p + 1)}>Siguiente ›</button>
            </div>
          )}
        </div>

        <div className="bento-row bento-row--moderation">
          <div className="bento-card glass">
            <div className="bento-card-header">
              <h3 className="bento-card-title">Moderación</h3>
              <div className="bento-mod-tabs">
                {(["reviews", "lists", "notes"] as const).map(t => (
                  <button key={t} className={`bento-mod-tab${reviewTab === t ? " active" : ""}`} onClick={() => setReviewTab(t)}>
                    {t === "reviews" ? "Reseñas" : t === "lists" ? "Listas" : "Notas"}
                  </button>
                ))}
              </div>
            </div>
            <div className="admin-accordion-list">
              {usersLoading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="admin-row-skeleton" />)}
              {!usersLoading && users.map(u => (
                <AccordionCard
                  key={`${u.id}-${reviewTab}`}
                  user={u}
                  tab={reviewTab}
                  token={user.token}
                  onLogout={onLogout}
                  onDeleteReview={deleteReview}
                  onDeleteList={deleteList}
                  onDeleteNotePublic={deleteNotePublic}
                  onDeleteNotePrivate={deleteNotePrivate}
                  onDecrement={() => {
                    const field = reviewTab === "reviews" ? "reviewCount" : reviewTab === "lists" ? "listCount" : "noteCount";
                    decrementCount(u.id, field);
                  }}
                  countLabel={reviewTab === "reviews" ? "reseñas" : reviewTab === "lists" ? "listas" : "notas"}
                  count={reviewTab === "reviews" ? u.reviewCount : reviewTab === "lists" ? u.listCount : u.noteCount}
                />
              ))}
              {!usersLoading && users.every(u => (reviewTab === "reviews" ? u.reviewCount : reviewTab === "lists" ? u.listCount : u.noteCount) === 0) && (
                <p className="admin-empty">No hay contenido todavía.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {confirm && <AppConfirm {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
