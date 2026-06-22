import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Flame, Gamepad2, Moon, Search, Star, Sun, User } from "lucide-react";
import type { GameSummary } from "../types";
import type { AuthUser } from "../App";
import { API_BASE } from "../config";
import { useScrolled } from "../hooks/useScrolled";
import SearchOverlay from "../components/SearchOverlay";

type Page = "home" | "profile" | "user" | "login" | "game" | "calendar" | "games" | "admin";

type CalendarPageProps = {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onNavigate: (page: Page) => void;
  onGoBack: () => void;
  user: AuthUser | null;
  onLogout: () => void;
  onViewGame?: (rawgGameId: number) => void;
};

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DOW = ["L", "M", "X", "J", "V", "S", "D"];

function getTopGame(games: GameSummary[]): GameSummary | null {
  if (!games.length) return null;
  return games.reduce((best, g) => {
    const score = (x: GameSummary) =>
      (x.metacritic ?? 0) * 2 + (x.rawgRating ?? 0) * 10 + (x.added ?? 0) / 10000;
    return score(g) > score(best) ? g : best;
  });
}

function MiniCalendar({ year, month, hotDays, clickableDays, onDayClick, gameCountByDay, maxDayCount }: {
  year: number;
  month: number;
  hotDays: Set<number>;
  clickableDays: Set<number>;
  onDayClick: (day: number) => void;
  gameCountByDay: Map<number, number>;
  maxDayCount: number;
}) {
  const today = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow    = new Date(year, month - 1, 1).getDay();
  const startOffset = (firstDow + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d: number) =>
    today.getFullYear() === year &&
    today.getMonth() + 1 === month &&
    today.getDate() === d;

  return (
    <div className="mini-cal-grid">
      {DOW.map(d => <div key={d} className="mini-cal-dow">{d}</div>)}
      {cells.map((day, i) => {
        const hasGames = day !== null && clickableDays.has(day);
        const todayCell = day !== null && isToday(day);
        const count = day !== null ? (gameCountByDay.get(day) ?? 0) : 0;
        const heat = !todayCell && maxDayCount > 0 && count > 0
          ? Math.max(8, Math.round((count / maxDayCount) * 38))
          : 0;
        return (
          <div
            key={i}
            className={`mini-cal-cell${day === null ? " empty" : ""}${todayCell ? " today" : ""}${hasGames ? " has-games" : ""}`}
            style={heat > 0 ? { background: `color-mix(in srgb, var(--accent) ${heat}%, transparent)` } : undefined}
            onClick={() => hasGames && onDayClick(day!)}
          >
            {day !== null && (
              <>
                <span className="mini-cal-num">{day}</span>
                {hotDays.has(day) && <div className="mini-cal-dot" />}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CalendarPage({
  theme, onToggleTheme, onNavigate, onGoBack, user, onViewGame,
}: CalendarPageProps) {
  const scrolled    = useScrolled();
  const [searchOpen, setSearchOpen] = useState(false);

  const todayDate = new Date();
  const [year,  setYear]  = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth() + 1);
  const [games,   setGames]   = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setGames([]);
    fetch(`${API_BASE}/api/games/releases?year=${year}&month=${month}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: GameSummary[]) => { setGames(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year, month]);

  const gamesByDay = useMemo(() => {
    const map = new Map<number, GameSummary[]>();
    for (const g of games) {
      if (!g.released) continue;
      const d = new Date(g.released + "T00:00:00");
      if (d.getFullYear() !== year || d.getMonth() + 1 !== month) continue;
      const day = d.getDate();
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(g);
    }
    return map;
  }, [games, year, month]);

  const hotDays = useMemo(() => {
    const set = new Set<number>();
    for (const g of games) {
      if (g.hot && g.released) {
        const d = new Date(g.released + "T00:00:00");
        if (d.getFullYear() === year && d.getMonth() + 1 === month)
          set.add(d.getDate());
      }
    }
    return set;
  }, [games, year, month]);

  const sortedDays = useMemo(
    () => Array.from(gamesByDay.keys()).sort((a, b) => a - b),
    [gamesByDay],
  );

  const clickableDays = useMemo(() => new Set(gamesByDay.keys()), [gamesByDay]);

  const gameCountByDay = useMemo(() => {
    const map = new Map<number, number>();
    for (const [day, gs] of gamesByDay) map.set(day, gs.length);
    return map;
  }, [gamesByDay]);

  const maxDayCount = useMemo(
    () => Math.max(0, ...Array.from(gameCountByDay.values())),
    [gameCountByDay],
  );

  const topGame = useMemo(() => getTopGame(games), [games]);

  function scrollToDay(day: number) {
    const el = document.getElementById(`cal-day-${day}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }
  function goToday() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  }

  const isCurrentMonth =
    todayDate.getFullYear() === year && todayDate.getMonth() + 1 === month;

  return (
    <div className="cal-page">

      <nav className={`navbar${scrolled ? " is-floating" : ""}`}>
        <div className="navbar-inner">
          <button className="nav-icon-btn" onClick={onGoBack} title="Volver">
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <a className="nav-brand" onClick={() => onNavigate("home")} style={{ cursor: "pointer" }}>
            <img
              src={`/media/logo-${theme === "dark" ? "oscuro" : "claro"}.png`}
              alt="GameDeck"
              className="brand-logo-img"
            />
            GameDeck
          </a>
          <div className="nav-spacer" />
          <div className="nav-actions">
            <button className="nav-icon-btn" title="Juegos" onClick={() => onNavigate("games")}>
              <Gamepad2 size={22} strokeWidth={2} />
            </button>
            <button className="nav-icon-btn nav-icon-active" title="Calendario">
              <Calendar size={20} strokeWidth={2} />
            </button>
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

      <div className="cal-month-nav">
        <button className="cal-nav-btn" onClick={prevMonth} aria-label="Mes anterior">
          <ChevronLeft size={18} />
        </button>
        <h1 className="cal-month-title">
          {MONTHS_ES[month - 1]}&nbsp;<span className="cal-year">{year}</span>
        </h1>
        <button className="cal-nav-btn" onClick={nextMonth} aria-label="Mes siguiente">
          <ChevronRight size={18} />
        </button>
        {!isCurrentMonth && (
          <button className="cal-today-btn" onClick={goToday}>Hoy</button>
        )}
      </div>


      <div className="cal-body">

        <main className="cal-main">
          {loading && (
            <div className="cal-loading">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="cal-skeleton-day">
                  <div className="cal-skeleton-heading" />
                  <div className="cal-masonry">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <div key={j} className={`cal-cover-skeleton${j % 4 === 0 ? " is-hot" : ""}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && sortedDays.length === 0 && (
            <div className="cal-empty">
              <Calendar size={48} strokeWidth={1.2} />
              <p>No hay lanzamientos registrados este mes</p>
            </div>
          )}

          {!loading && sortedDays.map(day => {
            const dayGames = gamesByDay.get(day) ?? [];
            const hotCount = dayGames.filter(g => g.hot).length;
            return (
              <section key={day} id={`cal-day-${day}`} className="cal-day-section">
                <div className="cal-day-heading">
                  <span className="cal-day-num">{day} de {MONTHS_ES[month - 1]}</span>
                  <span className="cal-day-count">
                    {dayGames.length} lanzamiento{dayGames.length !== 1 ? "s" : ""}
                  </span>
                  {hotCount > 0 && (
                    <span className="cal-day-hot">
                      <Flame size={12} />
                      {hotCount} hot
                    </span>
                  )}
                </div>
                <div className={`cal-masonry${dayGames.length <= 3 ? " cal-masonry--sparse" : dayGames.length <= 8 ? " cal-masonry--medium" : ""}`}>
                  {dayGames.map((g, i) => (
                    <div
                      key={g.externalId ?? i}
                      className={`cal-cover-card${g.hot ? " is-hot" : ""}${onViewGame && g.externalId ? " is-navigable" : ""}`}
                      onClick={() => g.externalId && onViewGame?.(g.externalId)}
                      title={g.title ?? ""}
                    >
                      {g.coverUrl
                        ? <img src={g.coverUrl} alt={g.title ?? ""} loading="lazy" />
                        : <div className="cal-cover-placeholder">{g.title?.slice(0, 1)}</div>
                      }
                      {g.hot && (
                        <div className="cal-hot-badge">
                          <Flame size={10} />
                        </div>
                      )}
                      <div className="cal-cover-overlay">
                        <span className="cal-cover-title">{g.title}</span>
                        {g.metacritic != null && (
                          <span className="cal-cover-score">{g.metacritic}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </main>

        <aside className="cal-sidebar">
          <div className="cal-sidebar-card glass">
            <div className="cal-sidebar-month">
              {MONTHS_ES[month - 1]} {year}
            </div>
            <MiniCalendar
              year={year}
              month={month}
              hotDays={hotDays}
              clickableDays={clickableDays}
              onDayClick={scrollToDay}
              gameCountByDay={gameCountByDay}
              maxDayCount={maxDayCount}
            />
          </div>

          {!loading && games.length > 0 && (
            <div className="cal-chips-grid">
              <div className="profile-stat-chip glass" style={{ ["--chip-color" as never]: "var(--accent)" } as React.CSSProperties}>
                <span className="profile-stat-num">{games.length}</span>
                <span className="profile-stat-label">Lanzamientos</span>
              </div>
              <div className="profile-stat-chip glass" style={{ ["--chip-color" as never]: "#60a5fa" } as React.CSSProperties}>
                <span className="profile-stat-num">{sortedDays.length}</span>
                <span className="profile-stat-label">Días</span>
              </div>
              <div className="profile-stat-chip glass" style={{ ["--chip-color" as never]: "#f97316" } as React.CSSProperties}>
                <span className="profile-stat-num">{hotDays.size}</span>
                <span className="profile-stat-label">Hot</span>
              </div>
            </div>
          )}

          {!loading && topGame && (
            <div
              className={`cal-featured-card glass${topGame.externalId && onViewGame ? " is-navigable" : ""}`}
              onClick={() => topGame.externalId && onViewGame?.(topGame.externalId)}
            >
              <p className="cal-featured-label">Destacado del mes</p>
              <div className="cal-featured-cover">
                {topGame.coverUrl
                  ? <img src={topGame.coverUrl} alt={topGame.title ?? ""} />
                  : <div className="cal-featured-placeholder">{topGame.title?.slice(0, 1)}</div>
                }
                {topGame.metacritic != null && (
                  <span className="cal-featured-meta">{topGame.metacritic}</span>
                )}
              </div>
              <div className="cal-featured-info">
                <p className="cal-featured-title">{topGame.title}</p>
                {topGame.rawgRating != null && (
                  <p className="cal-featured-rating">
                    <Star size={11} strokeWidth={2.5} fill="currentColor" />
                    {topGame.rawgRating.toFixed(1)}
                  </p>
                )}
                {topGame.released && (
                  <p className="cal-featured-date">
                    {new Date(topGame.released + "T00:00:00").getDate()} de {MONTHS_ES[month - 1]}
                  </p>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {searchOpen && (
        <SearchOverlay
          onClose={() => setSearchOpen(false)}
          onViewGame={id => { setSearchOpen(false); onViewGame?.(id); }}
          onViewUser={() => setSearchOpen(false)}
          token={user?.token}
        />
      )}
    </div>
  );
}
