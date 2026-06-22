import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Calendar, Check, ChevronDown, Gamepad2, Grip, LayoutGrid, List, Moon, Plus, Search, Star, Sun, User, X } from "lucide-react";
import type { GameSummary } from "../types";
import type { Page } from "../App";
import { API_BASE } from "../config";
import Avatar from "../components/Avatar";
import EditEntryModal, { type GameInfo } from "../components/EditEntryModal";
import SearchOverlay from "../components/SearchOverlay";
import type { AuthUser } from "../App";
import { useScrolled } from "../hooks/useScrolled";
import { useAOS } from "../hooks/useAOS";

const GENRES = [
  { slug: "", label: "Todos los géneros" },
  { slug: "action", label: "Acción" },
  { slug: "indie", label: "Indie" },
  { slug: "adventure", label: "Aventura" },
  { slug: "role-playing-games-rpg", label: "RPG" },
  { slug: "strategy", label: "Estrategia" },
  { slug: "shooter", label: "Shooter" },
  { slug: "simulation", label: "Simulación" },
  { slug: "puzzle", label: "Puzzle" },
  { slug: "arcade", label: "Arcade" },
  { slug: "platformer", label: "Plataformas" },
  { slug: "racing", label: "Carreras" },
  { slug: "sports", label: "Deportes" },
  { slug: "fighting", label: "Lucha" },
  { slug: "casual", label: "Casual" },
  { slug: "family", label: "Familiar" },
];

const PLATFORMS = [
  { id: "", label: "Todas las plataformas" },
  { id: "4",   label: "PC" },
  { id: "187", label: "PlayStation 5" },
  { id: "18",  label: "PlayStation 4" },
  { id: "1",   label: "Xbox One" },
  { id: "186", label: "Xbox Series" },
  { id: "7",   label: "Nintendo Switch" },
  { id: "3",   label: "iOS" },
  { id: "21",  label: "Android" },
];

const ORDERINGS = [
  { value: "-added",      label: "Popularidad" },
  { value: "-rating",     label: "Rating" },
  { value: "-released",   label: "Más recientes" },
  { value: "-metacritic", label: "Metacritic" },
];

const PAGE_SIZE = 24;

type Layout = "grid4" | "grid6" | "list";

type DropdownOption = { value: string; label: string };

function FilterDropdown({ options, value, onChange }: {
  options: DropdownOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find(o => o.value === value) ?? options[0];
  const isActive = value !== options[0].value;

  return (
    <div
      className={`filter-dropdown${open ? " is-open" : ""}${isActive ? " is-active" : ""}`}
      ref={ref}
    >
      <button className="filter-dropdown-trigger" onClick={() => setOpen(o => !o)}>
        <span className="filter-dropdown-label">{selected.label}</span>
        <ChevronDown size={13} strokeWidth={2.5} className="filter-dropdown-arrow" />
      </button>
      {open && (
        <ul className="filter-dropdown-menu" role="listbox">
          {options.map(opt => (
            <li key={opt.value} role="option" aria-selected={opt.value === value}>
              <button
                className={`filter-dropdown-item${opt.value === value ? " is-selected" : ""}`}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                {opt.label}
                {opt.value === value && <Check size={12} strokeWidth={3} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function fetchBrowsePage(
  query: string, genre: string, platform: string, ordering: string, page: number
): Promise<{ items: GameSummary[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    page:     String(page),
    size:     String(PAGE_SIZE),
    ordering,
  });
  if (query.trim()) params.set("query", query.trim());
  if (genre)        params.set("genres", genre);
  if (platform)     params.set("platforms", platform);

  const res = await fetch(`${API_BASE}/api/games/browse?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const items: GameSummary[] = await res.json();
  return { items, hasMore: items.length === PAGE_SIZE };
}

type CardProps = {
  game: GameSummary;
  addState: "idle" | "added";
  index: number;
  onViewGame?: (id: number) => void;
  onAdd: (game: GameSummary, e: React.MouseEvent) => void;
};

function BrowseCard({ game, addState, index, onViewGame, onAdd }: CardProps) {
  const year   = game.released?.slice(0, 4) ?? null;
  const genre  = game.genres?.slice(0, 2).join(" · ") ?? null;
  const rating = game.rawgRating != null ? game.rawgRating.toFixed(1) : null;
  const delay  = `${(index % 12) * 55}ms`;

  return (
    <article
      className="browse-card"
      data-aos="fade-up"
      style={{ transitionDelay: delay }}
      onClick={() => game.externalId != null && onViewGame?.(game.externalId)}
    >
      <div className="browse-card-cover">
        {game.coverUrl
          ? <img src={game.coverUrl} alt={game.title ?? ""} loading="lazy" />
          : <div className="browse-card-cover-placeholder">🎮</div>
        }
        <div className="browse-card-overlay" />
        {rating && (
          <div className="browse-card-rating">
            <Star size={10} fill="currentColor" strokeWidth={0} />
            {rating}
          </div>
        )}
      </div>
      <div className="browse-card-info">
        <p className="browse-card-title">{game.title ?? "Sin título"}</p>
        <p className="browse-card-meta">{[genre, year].filter(Boolean).join(" · ")}</p>
        <button
          className={`browse-card-add${addState === "added" ? " is-added" : ""}`}
          disabled={addState === "added"}
          onClick={(e) => { e.stopPropagation(); onAdd(game, e); }}
          title={addState === "added" ? "Ya en tu biblioteca" : "Añadir a biblioteca"}
        >
          {addState === "added"
            ? <><Check size={13} strokeWidth={3} /> Añadido</>
            : <><Plus  size={13} strokeWidth={3} /> Añadir</>
          }
        </button>
      </div>
    </article>
  );
}

function BrowseListRow({ game, addState, index, onViewGame, onAdd }: CardProps) {
  const year      = game.released?.slice(0, 4) ?? null;
  const genres    = game.genres?.slice(0, 3).join(" · ") ?? null;
  const developer = game.developers?.[0] ?? null;
  const rating    = game.rawgRating != null ? game.rawgRating.toFixed(1) : null;
  const delay     = `${(index % 10) * 40}ms`;

  return (
    <article
      className="browse-list-row"
      data-aos="fade-up"
      style={{ transitionDelay: delay }}
      onClick={() => game.externalId != null && onViewGame?.(game.externalId)}
    >
      <div className="browse-list-thumb">
        {game.coverUrl
          ? <img src={game.coverUrl} alt={game.title ?? ""} loading="lazy" />
          : <div className="browse-list-thumb-placeholder">🎮</div>
        }
      </div>
      <div className="browse-list-info">
        <p className="browse-list-title">{game.title ?? "Sin título"}</p>
        <p className="browse-list-meta">
          {[genres, developer, year].filter(Boolean).join(" · ")}
        </p>
      </div>
      {rating && (
        <div className="browse-list-rating">
          <Star size={13} fill="currentColor" strokeWidth={0} />
          {rating}
        </div>
      )}
      <button
        className={`browse-list-add${addState === "added" ? " is-added" : ""}`}
        disabled={addState === "added"}
        onClick={(e) => { e.stopPropagation(); onAdd(game, e); }}
        title={addState === "added" ? "Ya en tu biblioteca" : "Añadir a biblioteca"}
      >
        {addState === "added"
          ? <><Check size={13} strokeWidth={3} /> Añadido</>
          : <><Plus  size={13} strokeWidth={3} /> Añadir</>
        }
      </button>
    </article>
  );
}

type GamesPageProps = {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onNavigate: (page: Page) => void;
  onGoBack: () => void;
  user: AuthUser | null;
  onLogout: () => void;
  onViewGame?: (rawgGameId: number) => void;
  onViewUser?: (username: string) => void;
  onViewGames?: () => void;
  onRequestLogin?: (rawgGameId: number) => void;
  initialOrdering?: string;
};

export default function GamesPage({
  theme, onToggleTheme, onNavigate, onGoBack,
  user, onLogout, onViewGame, onViewUser, onViewGames, onRequestLogin, initialOrdering,
}: GamesPageProps) {
  const scrolled = useScrolled();
  useAOS();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [query,    setQuery]    = useState("");
  const [genre,    setGenre]    = useState("");
  const [platform, setPlatform] = useState("");
  const [ordering, setOrdering] = useState(initialOrdering || "-added");
  const [layout,   setLayout]   = useState<Layout>("grid4");

  const [games,       setGames]       = useState<GameSummary[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(true);

  const [searchOpen, setSearchOpen] = useState(false);

  const [addState,     setAddState]     = useState<Record<number, "idle" | "added">>({});
  const [addModalGame, setAddModalGame] = useState<GameInfo | null>(null);

  const pageRef        = useRef(1);
  const hasMoreRef     = useRef(true);
  const loadingMoreRef = useRef(false);
  const queryRef       = useRef(query);
  const genreRef       = useRef(genre);
  const platformRef    = useRef(platform);
  const orderingRef    = useRef(ordering);
  const genRef         = useRef(0);
  const sentinelRef    = useRef<HTMLDivElement>(null);
  const debounceRef    = useRef<ReturnType<typeof setTimeout>>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { queryRef.current    = query;    }, [query]);
  useEffect(() => { genreRef.current    = genre;    }, [genre]);
  useEffect(() => { platformRef.current = platform; }, [platform]);
  useEffect(() => { orderingRef.current = ordering; }, [ordering]);
  useEffect(() => { hasMoreRef.current  = hasMore;  }, [hasMore]);

  useEffect(() => {
    if (!user?.token) return;
    fetch(`${API_BASE}/api/me/games/rawg-ids`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then((ids: number[] | null) => {
        if (!Array.isArray(ids)) return;
        setAddState(prev => {
          const next = { ...prev };
          ids.forEach(id => { next[id] = "added"; });
          return next;
        });
      })
      .catch(() => {});
  }, [user?.token]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const delay = query.trim() ? 400 : 0;

    debounceRef.current = setTimeout(async () => {
      const gen = ++genRef.current;
      pageRef.current = 1;
      hasMoreRef.current = true;
      setLoading(true);
      setGames([]);
      setHasMore(true);

      try {
        const result = await fetchBrowsePage(query, genre, platform, ordering, 1);
        if (genRef.current !== gen) return;
        setGames(result.items);
        setHasMore(result.hasMore);
        hasMoreRef.current = result.hasMore;
      } catch {
        if (genRef.current === gen) setGames([]);
      } finally {
        if (genRef.current === gen) setLoading(false);
      }
    }, delay);

    return () => clearTimeout(debounceRef.current);
  }, [query, genre, platform, ordering]);

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    const nextPage = pageRef.current + 1;
    const gen = genRef.current;
    setLoadingMore(true);

    fetchBrowsePage(queryRef.current, genreRef.current, platformRef.current, orderingRef.current, nextPage)
      .then(result => {
        if (genRef.current !== gen) return;
        setGames(prev => [...prev, ...result.items]);
        pageRef.current = nextPage;
        hasMoreRef.current = result.hasMore;
        setHasMore(result.hasMore);
      })
      .catch(() => {})
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [loadMore]);

  const handleAdd = (game: GameSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.token) {
      if (game.externalId != null) onRequestLogin?.(game.externalId);
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

  const skeletonCount = layout === "grid6" ? 12 : layout === "grid4" ? 10 : 5;

  return (
    <div className="page-wrapper">

      <nav className={`navbar${scrolled ? " is-floating" : ""}`}>
        <div className="navbar-inner">
          <button className="nav-icon-btn" onClick={onGoBack} title="Atrás">
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <a className="nav-brand" style={{ cursor: "pointer" }} onClick={() => onNavigate("home")}>
            <img
              src={`/media/logo-${theme === "dark" ? "oscuro" : "claro"}.png`}
              alt="GameDeck"
              className="brand-logo-img"
            />
            GameDeck
          </a>

          <div className="nav-spacer" />

          <div className="nav-actions">
            <button className="nav-icon-btn nav-icon-active" title="Juegos" onClick={onViewGames}>
              <Gamepad2 size={22} strokeWidth={2} />
            </button>
            <button className="nav-icon-btn" title="Calendario" onClick={() => onNavigate("calendar")}>
              <Calendar size={20} strokeWidth={2} />
            </button>
            {user ? (
              <button
                className="nav-avatar-btn"
                title={user.username}
                onClick={() => onNavigate("profile")}
              >
                <Avatar url={user.avatarUrl} username={user.username} imgClassName="nav-avatar-img" />
              </button>
            ) : (
              <button className="nav-icon-btn" title="Iniciar sesión" onClick={() => onNavigate("login")}>
                <User size={20} strokeWidth={2} />
              </button>
            )}
            <button className="nav-theme-btn" onClick={onToggleTheme} aria-label="Toggle theme">
              {theme === "dark"
                ? <Sun  size={20} strokeWidth={2} />
                : <Moon size={20} strokeWidth={2} />}
            </button>
            <button className="btn-search-pill" onClick={() => setSearchOpen(true)} title="Buscar">
              <Search size={19} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </nav>

      <main className="games-page">

        <section className="games-page-header">
          <h1 className="games-page-title">
            Todos los <span>Juegos</span>
          </h1>
          <p className="games-page-subtitle">Descubre, explora y añade a tu biblioteca</p>
        </section>

        <div className="games-toolbar">
          <div className="games-search-wrap">
            <Search size={15} strokeWidth={2} className="games-search-icon" />
            <input
              ref={searchInputRef}
              className="games-search-input"
              type="text"
              placeholder="Buscar juegos..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button
                className="games-search-clear"
                onClick={() => { setQuery(""); searchInputRef.current?.focus(); }}
                aria-label="Limpiar búsqueda"
              >
                <X size={11} strokeWidth={3} />
              </button>
            )}
          </div>

          <div className="games-filters">
            <FilterDropdown
              options={GENRES.map(g => ({ value: g.slug, label: g.label }))}
              value={genre}
              onChange={setGenre}
            />
            <FilterDropdown
              options={PLATFORMS.map(p => ({ value: p.id, label: p.label }))}
              value={platform}
              onChange={setPlatform}
            />
            <FilterDropdown
              options={ORDERINGS.map(o => ({ value: o.value, label: o.label }))}
              value={ordering}
              onChange={setOrdering}
            />
          </div>

          <div className="games-layout-toggle">
            <button
              className={`games-layout-btn${layout === "grid4" ? " active" : ""}`}
              onClick={() => setLayout("grid4")}
              title="5 columnas"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`games-layout-btn${layout === "grid6" ? " active" : ""}`}
              onClick={() => setLayout("grid6")}
              title="7 columnas"
            >
              <Grip size={16} />
            </button>
            <button
              className={`games-layout-btn${layout === "list" ? " active" : ""}`}
              onClick={() => setLayout("list")}
              title="Lista"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        <div className={`games-grid layout-${layout}`}>
          {loading
            ? Array.from({ length: skeletonCount }).map((_, i) => (
                <div
                  key={i}
                  className={`browse-skeleton${layout === "list" ? " browse-skeleton-list" : ""}`}
                />
              ))
            : games.map((game, i) => {
                const state = game.externalId != null ? addState[game.externalId] ?? "idle" : "idle";
                return layout === "list"
                  ? <BrowseListRow key={game.externalId ?? i} game={game} addState={state} index={i} onViewGame={onViewGame} onAdd={handleAdd} />
                  : <BrowseCard    key={game.externalId ?? i} game={game} addState={state} index={i} onViewGame={onViewGame} onAdd={handleAdd} />;
              })
          }
        </div>

        {!loading && games.length === 0 && (
          <div className="games-empty">
            <span className="games-empty-icon">🎮</span>
            <p>No se encontraron juegos para esta búsqueda.</p>
          </div>
        )}

        <div ref={sentinelRef} className="games-sentinel">
          {loadingMore && <div className="games-spinner" aria-label="Cargando más juegos…" />}
          {!hasMore && games.length > 0 && (
            <p className="games-end-label">Has visto todos los juegos</p>
          )}
        </div>
      </main>

      {addModalGame && user?.token && (
        <EditEntryModal
          mode="add"
          game={addModalGame}
          token={user.token}
          onAdded={() => {
            setAddState(prev => ({ ...prev, [addModalGame.rawgGameId]: "added" }));
            setAddModalGame(null);
          }}
          onClose={() => setAddModalGame(null)}
          onSessionExpired={() => { onLogout(); setAddModalGame(null); }}
        />
      )}

      {searchOpen && (
        <SearchOverlay
          onClose={() => setSearchOpen(false)}
          onViewGame={(id) => { setSearchOpen(false); onViewGame?.(id); }}
          onViewUser={(username) => { setSearchOpen(false); onViewUser?.(username); }}
          token={user?.token}
          onGameAdded={(rawgGameId) => setAddState(prev => ({ ...prev, [rawgGameId]: "added" }))}
        />
      )}
    </div>
  );
}
