import { useEffect, useRef, useState } from "react";
import { Award, Calendar, Check, ExternalLink, Flame, Gamepad2, MessageSquare, Moon, Plus, Search, Sun, User } from "lucide-react";
import type { GameSummary } from "../types";
import SearchOverlay from "../components/SearchOverlay";
import EditEntryModal, { type GameInfo } from "../components/EditEntryModal";
import Avatar from "../components/Avatar";
import type { AuthUser } from "../App";
import { API_BASE } from "../config";
import { useScrolled } from "../hooks/useScrolled";
import { useAOS } from "../hooks/useAOS";
import { formatDateEs } from "../lib/dateUtils";

const HERO_MESSAGES = [
  "Domina tu backlog. Toda tu colección en un solo lugar.",
  "Sube de nivel tu biblioteca. Tus juegos, tus reglas.",
  "Tu colección. Tu progreso. Tu GameDeck.",
  "Menos buscar, más jugar.",
];

const GLITCH_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&<>?█▓▒░";

type Glyph = { char: string; settled: boolean };

function useScramble(messages: string[], pauseMs = 3400) {
  const [glyphs, setGlyphs] = useState<Glyph[]>(
    () => messages[0].split("").map(ch => ({ char: ch, settled: true }))
  );
  const indexRef = useRef(0);
  const rafRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const GLITCH_FRAMES = 28;
    const LOCK_RATE = 1.4;

    function scrambleTo(target: string, done: () => void) {
      let frame = 0;

      function tick() {
        frame++;
        const settled = frame <= GLITCH_FRAMES
          ? 0
          : Math.min(Math.floor((frame - GLITCH_FRAMES) / LOCK_RATE), target.length);

        if (settled >= target.length) {
          setGlyphs(target.split("").map(ch => ({ char: ch, settled: true })));
          done();
          return;
        }

        setGlyphs(
          target.split("").map((ch, i) => ({
            char: i < settled
              ? ch
              : ch === " "
                ? " "
                : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)],
            settled: i < settled,
          }))
        );

        rafRef.current = requestAnimationFrame(tick);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    function cycle() {
      indexRef.current = (indexRef.current + 1) % messages.length;
      scrambleTo(messages[indexRef.current], () => {
        timerRef.current = setTimeout(cycle, pauseMs);
      });
    }

    timerRef.current = setTimeout(cycle, pauseMs);

    return () => {
      clearTimeout(timerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return glyphs;
}

type HomePageProps = {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onNavigate: (page: "home" | "profile" | "user" | "login" | "game" | "calendar" | "games" | "admin") => void;
  user: AuthUser | null;
  onLogout: () => void;
  onViewUser?: (username: string) => void;
  onViewGame?: (rawgGameId: number) => void;
  onViewGames?: (ordering?: string) => void;
  onRequestLogin?: (rawgGameId: number) => void;
};

const FALLBACK_FEATURED: GameSummary[] = [
  { externalId: 1, title: "Elden Ring", released: "2022-02-25", coverUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=200&q=80", rawgRating: 4.7, genres: ["RPG", "Action"] },
  { externalId: 2, title: "The Witcher 3", released: "2015-05-19", coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=200&q=80", rawgRating: 4.7, genres: ["RPG", "Open World"] },
  { externalId: 3, title: "God of War", released: "2018-04-20", coverUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=200&q=80", rawgRating: 4.6, genres: ["Action", "Adventure"] },
  { externalId: 4, title: "Baldur's Gate 3", released: "2023-08-03", coverUrl: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=200&q=80", rawgRating: 4.8, genres: ["RPG", "Strategy"] },
  { externalId: 5, title: "Cyberpunk 2077", released: "2020-12-10", coverUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=200&q=80", rawgRating: 4.3, genres: ["RPG", "FPS"] },
  { externalId: 6, title: "Red Dead Redemption 2", released: "2018-10-26", coverUrl: "https://images.unsplash.com/photo-1547394765-185e1e68f34e?auto=format&fit=crop&w=200&q=80", rawgRating: 4.7, genres: ["Action", "Open World"] },
];

const REVIEW_META = [
  { user: "polsyto", display: "Pablo", date: "Marzo 2025", status: "Completado", review: "Una obra maestra. El diseño de mundo abierto es incomparable, cada rincón esconde algo épico." },
  { user: "Alpax", display: "Jorge", date: "Noviembre 2024", status: "Jugando", review: "Enorme y completamente adictivo. La narrativa y el mundo abierto no tienen igual." },
  { user: "djorenes", display: "Raul", date: "Agosto 2023", status: "En pausa", review: "Una experiencia visual y sonora que no olvidarás. Kratos nunca fue tan humano." },
  { user: "jaguera", display: "Jon", date: "Junio 2024", status: "Abandonado", review: "La mejor decisión de compra del año. Horas que pasaron volando sin darme cuenta." },
  { user: "franSQL", display: "Fran", date: "Enero 2025", status: "Pendiente", review: "Night City es una ciudad viva. Bugs aparte, la historia te engancha desde el minuto uno." },
  { user: "dangerous", display: "Peligros", date: "Septiembre 2023", status: "Rejugando", review: "Una obra de arte interactiva. La atención al detalle es simplemente brutal." },
];

const STATUS_ICON: Record<string, string> = {
  "Completado": "🏁", "Jugando": "🎮", "En pausa": "⏸", "Abandonado": "❌", "Pendiente": "📋", "Rejugando": "🔄",
};

const GAME_REVIEWS: [string, string][] = [
  ["elden ring", "Un mundo abierto que redefine el género. Cada boss fight es un reto que te hace sentir que lo has ganado de verdad."],
  ["the witcher 3", "El estándar de los RPG de mundo abierto. Personajes con profundidad real y decisiones que de verdad importan."],
  ["god of war", "Kratos padre es otro nivel. La narrativa y el combate se complementan a la perfección en cada escena."],
  ["baldur", "Libertad total de decisión en un RPG que cumple con todo lo que promete. La co-op es absolutamente brutal."],
  ["cyberpunk", "Night City es una ciudad viva. Después de los parches, es exactamente el juego que prometía ser desde el principio."],
  ["red dead", "La historia de Arthur Morgan es de lo mejor que ha dado el gaming. Inmersión y narrativa en estado puro."],
  ["persona 5", "Una historia que no para de sorprender, mecánicas adictivas y una banda sonora que no te abandona jamás."],
  ["persona", "Sistema de combate por turnos que se siente fresco y una narrativa que engancha desde el primer momento."],
  ["the last of us", "Una narrativa cinematográfica sin igual. Joel y Ellie son dos de los mejores personajes de la historia del gaming."],
  ["hades", "Loop de roguelike perfecto. Imposible parar de jugar y la historia se cuenta de una forma totalmente original."],
  ["hollow knight", "Un mundo subterráneo lleno de secretos. Arte, música y jugabilidad al máximo nivel para un indie."],
  ["detroit", "Decisiones que cambian todo. Los personajes se sienten increíblemente humanos en cada momento."],
  ["grand prix", "Simulación arcade que lleva la experiencia de carreras a otro nivel. Perfecto para sesiones rápidas."],
  ["dark souls", "El rey de los soulslike. Cada muerte es una lección y cada victoria sabe mejor que en cualquier otro juego."],
  ["sekiro", "El sistema de combate más satisfactorio del género. La curva de dificultad es dura pero siempre justa."],
  ["metal gear", "Kojima en estado puro. Narrativa compleja, sigilo magistral y momentos que no olvidarás en años."],
  ["doom", "La esencia del shooter en su forma más pura y adrenalínica. Banda sonora que te mete en modo bestia."],
  ["disco elysium", "Un RPG sin combate que te hace pensar más que cualquier otro juego. Escritura brillante y personaje único."],
  ["elder scrolls", "Un mundo enorme lleno de vida y secretos. Cientos de horas que pasan sin darte cuenta."],
  ["skyrim", "Un mundo enorme lleno de vida y secretos. Cientos de horas que pasan sin darte cuenta."],
  ["morrowind", "El RPG de mundo abierto más profundo de su época. Una libertad de construcción de personaje sin igual."],
  ["oblivion", "Mundo abierto con una narrativa principal memorable y mazmorras que te mantienen enganchado horas."],
];

function getReview(title: string): string {
  const lower = title.toLowerCase();
  for (const [key, text] of GAME_REVIEWS) {
    if (lower.includes(key)) return text;
  }
  return "Una experiencia que no te dejará indiferente. Un must-play para cualquier gamer que se precie.";
}


function formatAdded(n: number | null | undefined): string {
  if (!n) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toString();
}

type RailItem = { title: string; genre: string; date: string; coverUrl: string; externalId?: number };

const AUTHOR_DEFS = [
  {
    username: "vicenttto",
    name: "Vicente Aparicio",
    role: "Full Stack Developer",
    school: "DAW · UCAM",
    url: "https://github.com/vicenttto",
    game: { title: "Hollow Knight: Silksong", year: "2025", genre: "Metroidvania · Acción", cover: "https://cdn.akamai.steamstatic.com/steam/apps/1030300/library_600x900.jpg" },
  },
  {
    username: "gzbl-dev",
    name: "Gonzalo Bernal",
    role: "Full Stack Developer",
    school: "DAW · UCAM",
    url: "https://github.com/gzbl-dev",
    game: { title: "League of Legends", year: "2009", genre: "MOBA · Estrategia", cover: "https://ddragon.leagueoflegends.com/cdn/img/champion/loading/Ahri_0.jpg" },
  },
];

const CHART_TABS: { Icon: React.ElementType; label: string }[] = [
  { Icon: Flame, label: "Tendencias" },
  { Icon: Award, label: "Mejor Metacritic" },
  { Icon: MessageSquare, label: "Más Reseñados" },
];

const STATS = [
  { value: 12384, label: "Juegos", pixels: ["⚔", "⚔"], fill: 78, color: "var(--accent)" },
  { value: 4201, label: "Reseñas", pixels: ["★", "★", "★"], fill: 52, color: "#f59e0b" },
  { value: 3890, label: "Usuarios", pixels: ["♥", "♥", "♥"], fill: 48, color: "#ff6b6b" },
  { value: 8100000, label: "Horas jugadas", pixels: ["⏱", "⏱"], fill: 91, color: "#34d399" },
];

function formatStat(current: number, final: number): string {
  if (final >= 1_000_000) return (current / 1_000_000).toFixed(1) + "M";
  if (final >= 10_000) return (current / 1_000).toFixed(1) + "K";
  return current.toLocaleString("es-ES");
}

function StatsStrip() {
  const [counts, setCounts] = useState(() => STATS.map(() => 0));
  const stripRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();

      const startTime = performance.now();
      const DURATION = 1600;

      const tick = (now: number) => {
        const progress = Math.min((now - startTime) / DURATION, 1);
        const ease = 1 - Math.pow(1 - progress, 4);
        setCounts(STATS.map(s => Math.round(s.value * ease)));
        if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    }, { threshold: 0.3 });

    observer.observe(el);
    return () => { observer.disconnect(); cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div className="stats-strip" ref={stripRef}>
      {STATS.map((s, i) => (
        <div
          className="stats-item"
          key={s.label}
          style={{ "--si-color": s.color, "--si-fill": `${s.fill}%` } as React.CSSProperties}
        >
          <div className="stats-pixels">
            {s.pixels.map((p, j) => (
              <span
                key={j}
                className="stats-pixel"
                style={{ animationDelay: `${j * 0.08}s` }}
              >{p}</span>
            ))}
          </div>
          <span className="stats-number">{formatStat(counts[i], s.value)}</span>
          <span className="stats-label">{s.label}</span>
          <div className="stats-bar">
            <div className="stats-bar-fill" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ScrollableRail({ children }: { children: React.ReactNode }) {
  const railRef    = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const rafRef     = useRef(0);

  const scroll = (dir: -1 | 1) => {
    railRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    const rail     = railRef.current;
    if (!viewport || !rail) return;
    const io = new IntersectionObserver(
      ([entry]) => rail.classList.toggle("is-in-view", entry.isIntersecting),
      { threshold: 0.15 }
    );
    io.observe(viewport);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    let startX = 0, scrollLeft = 0, lastX = 0, lastTime = 0, velocity = 0, dragging = false;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      scrollLeft = el.scrollLeft;
      lastX = e.clientX;
      lastTime = Date.now();
      velocity = 0;
      cancelAnimationFrame(rafRef.current);
      el.style.cursor = "grabbing";
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      const now = Date.now();
      velocity = (e.clientX - lastX) / Math.max(now - lastTime, 1);
      lastX = e.clientX;
      lastTime = now;
      el.scrollLeft = scrollLeft - (e.clientX - startX);
    };

    const onMouseUp = () => {
      if (!dragging) return;
      dragging = false;
      el.style.cursor = "grab";
      let v = velocity * 20;
      const coast = () => {
        if (Math.abs(v) < 0.2) return;
        el.scrollLeft -= v;
        v *= 0.95;
        rafRef.current = requestAnimationFrame(coast);
      };
      rafRef.current = requestAnimationFrame(coast);
    };

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div className="rail-viewport" ref={viewportRef}>
      <div className="game-rail" ref={railRef}>{children}</div>
      <div className="rail-fade-left" aria-hidden />
      <div className="rail-fade-right" aria-hidden />
      <button className="rail-arrow rail-arrow-left" onClick={() => scroll(-1)} aria-label="Anterior">‹</button>
      <button className="rail-arrow rail-arrow-right" onClick={() => scroll(1)} aria-label="Siguiente">›</button>
    </div>
  );
}

function GameRailCard({ item, onAddClick, onCardClick, inLibrary }: { item: RailItem; onAddClick?: () => void; onCardClick?: () => void; inLibrary?: boolean }) {
  return (
    <article
      className={`rail-card${onCardClick ? " is-navigable" : ""}`}
      onClick={onCardClick}
    >
      <div className="rail-card-cover">
        {item.coverUrl
          ? <img src={item.coverUrl} alt={item.title} draggable={false} />
          : <div className="rail-card-no-cover" aria-hidden>🎮</div>
        }
        <button
          className={`btn-add${inLibrary ? " is-added" : ""}`}
          aria-label={inLibrary ? "En biblioteca" : "Añadir a biblioteca"}
          onClick={(e) => { e.stopPropagation(); if (!inLibrary) onAddClick?.(); }}
        >
          {inLibrary ? <Check size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2.5} />}
        </button>
      </div>
      <div className="rail-card-info">
        <p className="rail-card-title">{item.title}</p>
        <p className="rail-card-genre">{item.genre}</p>
        <p className="rail-card-date">{item.date}</p>
      </div>
    </article>
  );
}

export default function HomePage({ theme, onToggleTheme, onNavigate, user, onLogout, onViewUser, onViewGame, onViewGames, onRequestLogin }: HomePageProps) {
  const glyphs = useScramble(HERO_MESSAGES);
  const scrolled = useScrolled();
  useAOS();
  const [topGames, setTopGames] = useState<GameSummary[] | null>(null);
  const [newReleases, setNewReleases] = useState<GameSummary[] | null>(null);
  const [upcoming, setUpcoming] = useState<GameSummary[] | null>(null);
  const [trending, setTrending] = useState<GameSummary[] | null>(null);
  const [bestMetacritic, setBestMetacritic] = useState<GameSummary[] | null>(null);
  const [mostReviewed, setMostReviewed] = useState<GameSummary[] | null>(null);
  const [activeChart, setActiveChart] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [addModalGame, setAddModalGame] = useState<GameInfo | null>(null);
  const [libraryIds, setLibraryIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user?.token) { setLibraryIds(new Set()); return; }
    fetch(`${API_BASE}/api/me/games/rawg-ids`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((ids: number[]) => setLibraryIds(new Set(Array.isArray(ids) ? ids : [])))
      .catch(() => {});
  }, [user?.token]);

  const handleAddClick = (g: GameSummary) => {
    if (!user?.token) {
      if (g.externalId != null && onRequestLogin) onRequestLogin(g.externalId);
      else onNavigate("login");
      return;
    }
    if (g.externalId == null) return;
    if (libraryIds.has(g.externalId)) return;
    setAddModalGame({
      rawgGameId: g.externalId,
      title:      g.title ?? "",
      coverUrl:   g.coverUrl,
      releasedAt: g.released,
      genres:     g.genres ?? [],
    });
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/games/new-releases?size=15`)
      .then(r => r.json())
      .then((d: GameSummary[]) => setNewReleases(Array.isArray(d) ? d : []))
      .catch(() => setNewReleases([]));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/games/upcoming?size=15`)
      .then(r => r.json())
      .then((d: GameSummary[]) => setUpcoming(Array.isArray(d) ? d : []))
      .catch(() => setUpcoming([]));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/games/trending?size=10`)
      .then(r => r.json())
      .then((d: GameSummary[]) => setTrending(Array.isArray(d) ? d : []))
      .catch(() => setTrending([]));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/games/best-metacritic?size=10`)
      .then(r => r.json())
      .then((d: GameSummary[]) => setBestMetacritic(Array.isArray(d) ? d : []))
      .catch(() => setBestMetacritic([]));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/games/most-reviewed?size=10`)
      .then(r => r.json())
      .then((d: GameSummary[]) => setMostReviewed(Array.isArray(d) ? d : []))
      .catch(() => setMostReviewed([]));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/games/top?size=20`)
      .then(r => r.json())
      .then((d: GameSummary[]) => {
        if (!Array.isArray(d)) { setTopGames([]); return; }
        const seen = new Set<string>();
        const unique = d.filter(g => {
          const base = (g.title ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).slice(0, 3).join(" ");
          if (seen.has(base)) return false;
          seen.add(base);
          return true;
        }).slice(0, 6);
        setTopGames(unique);
      })
      .catch(() => setTopGames([]));
  }, []);


  return (
    <div className="page-wrapper">

      <section className="hero">

        <nav className={`navbar${scrolled ? " is-floating" : ""}`}>
          <div className="navbar-inner">
            <a className="nav-brand">
              <img src={`/media/logo-${theme === "dark" ? "oscuro" : "claro"}.png`} alt="GameDeck" className="brand-logo-img" />
              GameDeck
            </a>

            <div className="nav-spacer" />

            <div className="nav-actions">
              <button className="nav-icon-btn" title="Juegos" onClick={() => onViewGames?.()}>
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
                  ? <Sun size={20} strokeWidth={2} />
                  : <Moon size={20} strokeWidth={2} />}
              </button>
              <button className="btn-search-pill" title="Search game" onClick={() => setSearchOpen(true)}>
                <Search size={19} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </nav>
        <div className="hero-glows" aria-hidden>
          <div className="hero-glow hero-glow-1" />
          <div className="hero-glow hero-glow-2" />
          <div className="hero-glow hero-glow-3" />
        </div>
        <div className="hero-media" aria-hidden>
          <img
            className="hero-media-layer"
            src={theme === "dark" ? "/media/hornet-1.png" : "/media/dog-1.png"}
            alt=""
            draggable={false}
          />
          <video
            key={theme}
            className="hero-media-layer"
            autoPlay
            loop
            muted
            playsInline
          >
            <source
              src={theme === "dark" ? "/video/hornet-1.mp4" : "/video/dog-1.mp4"}
              type="video/mp4"
            />
          </video>
          <div className="hero-media-overlay" />
        </div>

        <div className="hero-content container">
          <p className="hero-eyebrow">Welcome to</p>
          <h1 className="hero-title">GameDeck</h1>
          <p className="hero-subtitle">
            {glyphs.map((g, i) => (
              <span key={i} className={g.settled ? undefined : "glyph-scramble"}>
                {g.char}
              </span>
            ))}
          </p>
        </div>
      </section>

      <div className="hero-bottom-fade" />

      <section className="featured-section container">
        <div className="section-header" data-aos="fade-up">
          <h2>Top Rated ⭐</h2>
          <a className="section-link section-link-featured" style={{ cursor: "pointer" }} onClick={() => onViewGames?.("-rating")}>Mostrar todos</a>
        </div>

        <div className="rc-grid">
          {topGames === null
            ? Array.from({ length: 6 }).map((_, i) => (
              <article key={i} className="rc-card rc-card-skeleton" />
            ))
            : topGames.slice(0, 6).map((game: GameSummary, i: number) => {
              const meta = REVIEW_META[i];
              const rating = game.rawgRating ? (game.rawgRating * 2).toFixed(1) : "—";
              const initials = meta.display.slice(0, 2).toUpperCase();
              return (
                <article
                  key={game.externalId ?? i}
                  data-aos="fade-up"
                  style={{ transitionDelay: `${i * 70}ms` }}
                  className={`rc-card${onViewGame && game.externalId != null ? " is-navigable" : ""}`}
                  onClick={() => { if (onViewGame && game.externalId != null) onViewGame(game.externalId); }}
                >
                  <div className="rc-header">
                    <div className="rc-avatar">{initials}</div>
                    <div className="rc-user-info">
                      <span className="rc-display">{meta.display}</span>
                      <span className="rc-handle">@{meta.user}</span>
                    </div>
                    <span className="rc-date">{meta.date}</span>
                  </div>
                  <div className="rc-score-row">
                    <span className="rc-score">{rating}</span>
                    <span className="rc-status">
                      {STATUS_ICON[meta.status] ?? "🎮"} {meta.status}
                    </span>
                  </div>
                  <div className="rc-game-row">
                    {game.coverUrl && (
                      <img className="rc-cover" src={game.coverUrl} alt={game.title ?? ""} />
                    )}
                    <div className="rc-game-info">
                      <p className="rc-game-title">{game.title}</p>
                      <p className="rc-review">{getReview(game.title ?? "")}</p>
                    </div>
                  </div>
                </article>
              );
            })
          }
        </div>
      </section>

      <section className="section-releases container">
        <div className="section-header" data-aos="fade-up">
          <h2>Nuevos lanzamientos 🔥</h2>
          <a style={{ cursor: "pointer" }} onClick={() => onViewGames?.("-released")}>Mostrar todos</a>
        </div>
      </section>
      <ScrollableRail>
        {newReleases === null
          ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="rail-card rail-card-skeleton" />)
          : newReleases.map(g => (
            <GameRailCard key={g.externalId} item={{
              title: g.title ?? "",
              genre: (g.genres ?? []).slice(0, 2).join(", "),
              date: formatDateEs(g.released),
              coverUrl: g.coverUrl ?? "",
            }}
            inLibrary={g.externalId != null && libraryIds.has(g.externalId)}
            onAddClick={() => handleAddClick(g)}
            onCardClick={g.externalId != null ? () => onViewGame?.(g.externalId!) : undefined} />
          ))
        }
      </ScrollableRail>

      <div className="stats-section" data-aos="fade-in">
        <div className="container">
          <StatsStrip />
        </div>
      </div>

      <section className="section-releases container">
        <div className="section-header" data-aos="fade-up">
          <h2>Próximos lanzamientos 📅</h2>
          <a style={{ cursor: "pointer" }} onClick={() => onNavigate("calendar")}>Mostrar todos</a>
        </div>
      </section>
      <ScrollableRail>
        {upcoming === null
          ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="rail-card rail-card-skeleton" />)
          : upcoming.map(g => (
            <GameRailCard key={g.externalId} item={{
              title: g.title ?? "",
              genre: (g.genres ?? []).slice(0, 2).join(", "),
              date: formatDateEs(g.released),
              coverUrl: g.coverUrl ?? "",
            }}
            inLibrary={g.externalId != null && libraryIds.has(g.externalId)}
            onAddClick={() => handleAddClick(g)}
            onCardClick={g.externalId != null ? () => onViewGame?.(g.externalId!) : undefined} />
          ))
        }
      </ScrollableRail>

      <section className="section container">
        <div className="charts-layout">

          <div className="leaderboard-panel" data-aos="fade-up">
            <div className="section-header lb-section-header">
              <h2 className="lb-section-title">
                {CHART_TABS[activeChart].label}
              </h2>
            </div>
            {[trending, bestMetacritic, mostReviewed][activeChart] === null
              ? Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="lb-row lb-row-skeleton">
                  <div className="lb-skel lb-skel-rank" />
                  <div className="lb-skel lb-skel-cover" />
                  <div className="lb-skel-info">
                    <div className="lb-skel lb-skel-title" />
                    <div className="lb-skel lb-skel-genre" />
                  </div>
                </div>
              ))
              : ([trending, bestMetacritic, mostReviewed][activeChart] ?? []).map((g, i) => (
                <div
                  className={`lb-row${onViewGame && g.externalId != null ? " is-navigable" : ""}`}
                  key={g.externalId ?? i}
                  style={{ "--lb-cover": `url(${g.coverUrl})` } as React.CSSProperties}
                  onClick={() => { if (onViewGame && g.externalId != null) onViewGame(g.externalId); }}
                >
                  <div className="lb-row-bg" aria-hidden />
                  <span className="lb-rank">#{i + 1}</span>
                  <img className="lb-cover" src={g.coverUrl ?? ""} alt={g.title ?? ""} draggable={false} />
                  <div className="lb-info">
                    <p className="lb-title">{g.title}</p>
                    <p className="lb-genre">{(g.genres ?? []).slice(0, 2).join(", ")}</p>
                  </div>
                  <span className="lb-plays">
                    {activeChart === 0 && formatAdded(g.added)}
                    {activeChart === 1 && (g.metacritic != null ? g.metacritic : "—")}
                    {activeChart === 2 && formatAdded(g.ratingsCount)}
                  </span>
                  <button
                    className={`lb-add${g.externalId != null && libraryIds.has(g.externalId) ? " is-added" : ""}`}
                    aria-label={g.externalId != null && libraryIds.has(g.externalId) ? "En biblioteca" : "Añadir a biblioteca"}
                    onClick={(e) => { e.stopPropagation(); handleAddClick(g); }}
                  >
                    {g.externalId != null && libraryIds.has(g.externalId) ? <Check size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2.5} />}
                  </button>
                </div>
              ))
            }
            <button className="lb-show-more" onClick={() => {
              const orderings = ["-added", "-metacritic", "-added"];
              onViewGames?.(orderings[activeChart]);
            }}>Ver más</button>
          </div>

          <div className="chart-panel" data-aos="fade-in">
            <p className="chart-panel-title">Filtros</p>
            <div className="chart-tabs">
              {CHART_TABS.map((tab, i) => (
                <button
                  key={tab.label}
                  className={`chart-tab${activeChart === i ? " active" : ""}`}
                  onClick={() => setActiveChart(i)}
                >
                  <tab.Icon size={16} strokeWidth={2} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>



      <section className="authors-section container">
        <p className="authors-eyebrow" data-aos="fade-up">Detrás del proyecto</p>
        <h2 className="authors-title" data-aos="fade-up" style={{ transitionDelay: "80ms" }}>El Equipo</h2>
        <div className="authors-grid">

          {AUTHOR_DEFS.map((author, i) => (
            <div className="author-flip author-flip-ready" key={author.username} data-aos="zoom" style={{ transitionDelay: `${i * 120}ms` }}>
              <div className="author-flip-inner">

                <div className="author-flip-front glass">
                  <div className="author-avatar-wrap">
                    <img
                      className="author-avatar"
                      src={`https://github.com/${author.username}.png`}
                      alt={author.name}
                    />
                  </div>
                  <p className="author-name">{author.name}</p>
                  <p className="author-role">{author.role}</p>
                  <p className="author-school">{author.school}</p>
                </div>

                <div
                  className="author-flip-back author-game-card"
                  style={{ backgroundImage: `url(${author.game.cover})` }}
                >
                  <div className="author-game-overlay" aria-hidden />
                  <span className="author-game-badge">Juego favorito</span>
                  <div className="author-game-content">
                    <p className="author-game-genre">{author.game.genre}</p>
                    <p className="author-game-title">{author.game.title}</p>
                    <div className="author-game-footer">
                      <span className="author-game-year">{author.game.year}</span>
                      <a
                        className="author-gh-btn"
                        href={author.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink size={13} strokeWidth={2} />
                        GitHub
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ))}

        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
        <div className="footer-inner">

          <div className="footer-brand" data-aos="fade-up">
            <div className="footer-logo">
              <img src={`/media/logo-${theme === "dark" ? "oscuro" : "claro"}.png`} alt="GameDeck" className="brand-logo-img" />
              GameDeck
            </div>
            <p className="footer-tagline">Tu colección. Tu progreso. Tu GameDeck.</p>
            <p className="footer-desc">
              Plataforma de gestión de colección de videojuegos desarrollada como
              Trabajo de Fin de Grado. Registra, puntúa y comparte tu biblioteca.
            </p>
          </div>

          <div className="footer-col" data-aos="fade-up" style={{ transitionDelay: "100ms" }}>
            <h4 className="footer-col-title">Características</h4>
            <ul className="footer-feature-list">
              <li>Colección personal de juegos</li>
              <li>Reseñas y puntuaciones</li>
              <li>Leaderboards en tiempo real</li>
              <li>Sistema de listas personalizadas</li>
              <li>Perfiles de usuario</li>
              <li>Seguimiento de amigos</li>
            </ul>
          </div>

          <div className="footer-col" data-aos="fade-up" style={{ transitionDelay: "200ms" }}>
            <h4 className="footer-col-title">Créditos</h4>
            <div className="footer-credits-list">
              <a className="footer-credit-card" href="https://rawg.io" target="_blank" rel="noopener noreferrer">
                <img
                  src="https://rawg.io/favicon.ico"
                  alt="RAWG"
                  className="credit-logo"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <span className="credit-text">
                  <span className="credit-name">RAWG</span>
                  <span className="credit-desc">Datos, portadas y metadatos de juegos</span>
                </span>
              </a>
              <a className="footer-credit-card" href="https://www.metacritic.com" target="_blank" rel="noopener noreferrer">
                <img
                  src="https://www.metacritic.com/favicon.ico"
                  alt="Metacritic"
                  className="credit-logo"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <span className="credit-text">
                  <span className="credit-name">Metacritic</span>
                  <span className="credit-desc">Puntuaciones de crítica especializada</span>
                </span>
              </a>
              <a className="footer-credit-card" href="https://lucide.dev" target="_blank" rel="noopener noreferrer">
                <img
                  src="https://lucide.dev/favicon.ico"
                  alt="Lucide"
                  className="credit-logo"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <span className="credit-text">
                  <span className="credit-name">Lucide Icons</span>
                  <span className="credit-desc">Librería de iconos open source</span>
                </span>
              </a>
            </div>
          </div>

        </div>
        <div className="footer-copy">
          <span>© 2026 GameDeck · Proyecto TFG · DAW</span>
        </div>
        </div>
      </footer>

      {searchOpen && (
        <SearchOverlay
          onClose={() => setSearchOpen(false)}
          onViewUser={onViewUser ?? (() => { })}
          onViewGame={onViewGame}
          token={user?.token}
          currentUsername={user?.username}
          onLoginRequested={(rawgGameId) => {
            if (rawgGameId != null && onRequestLogin) onRequestLogin(rawgGameId);
            else onNavigate("login");
          }}
          onGameAdded={(rawgGameId) => setLibraryIds(prev => new Set([...prev, rawgGameId]))}
          onSessionExpired={onLogout}
        />
      )}

      {addModalGame && user?.token && (
        <EditEntryModal
          mode="add"
          game={addModalGame}
          token={user.token}
          onAdded={() => {
            if (addModalGame?.rawgGameId != null) {
              setLibraryIds(prev => new Set([...prev, addModalGame.rawgGameId]));
            }
            setAddModalGame(null);
          }}
          onClose={() => setAddModalGame(null)}
          onSessionExpired={onLogout}
        />
      )}
    </div>
  );
}
